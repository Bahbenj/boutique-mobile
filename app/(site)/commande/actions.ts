"use server";

import { createHash } from "node:crypto";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { paymentMethodIds } from "@/config/site";
import { CATALOG_TAG } from "@/lib/catalog";
import { normalizeMlPhone } from "@/lib/phone";
import type { AppliedCode } from "@/lib/promo-shared";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Enregistre une commande. Le navigateur n'envoie que des identifiants et des
 * quantités : prix, frais de livraison et disponibilité sont recalculés en base
 * par place_order (prix relus, stock décrémenté atomiquement, zone et mode de
 * paiement vérifiés). Appelée uniquement côté serveur avec la clé de service.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const orderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(3).max(80),
    phone: z.string().max(30),
    zone_id: z.string().max(60).optional(),
    city: z.string().trim().max(80),
    address: z.string().trim().max(200),
    note: z.string().trim().max(500).optional(),
    promo_code: z.string().trim().max(30).optional(),
  }),
  items: z
    .array(
      z.object({
        product_id: z.string().max(60),
        qty: z.number().int().min(1).max(20),
        color: z.string().max(40).optional(),
        storage: z.string().max(30).optional(),
      }),
    )
    .min(1)
    .max(30),
  delivery: z.enum(["home", "pickup"]),
  payment: z.enum(paymentMethodIds),
  /** Champ piège invisible : rempli uniquement par les robots. */
  website: z.string().max(0).optional(),
});

export type PlaceOrderInput = z.input<typeof orderSchema>;

export type PlacedLine = { name: string; variant?: string; qty: number; price: number };

export type PlaceOrderResult =
  | { ok: true; number: string; subtotal: number; discount: number; promoCode: string | null; fee: number; total: number; region: string; lines: PlacedLine[] }
  /** fallback : enregistrement impossible (base absente ou injoignable) → envoi WhatsApp sans numéro ;
   *  needsLogin : session expirée ou absente → page de connexion, retour à la commande */
  | { ok: false; error: string; fallback?: boolean; needsLogin?: boolean };

const messages: Record<string, string> = {
  invalid_items: "Votre panier est vide ou trop grand.",
  invalid_qty: "Une quantité est invalide.",
  product_unavailable: "Un produit de votre panier n'est plus disponible. Retirez-le puis réessayez.",
  invalid_variant: "Une couleur ou une capacité n'est plus proposée. Retirez le produit puis ajoutez-le à nouveau.",
  insufficient_stock: "Stock insuffisant",
  invalid_delivery: "Ce mode de livraison n'est plus proposé.",
  invalid_zone: "Cette zone de livraison n'est plus desservie. Choisissez-en une autre.",
  invalid_payment: "Ce mode de paiement n'est plus proposé. Choisissez-en un autre.",
  promo_code_invalid: "Ce code promo n'existe pas ou n'est plus valable. Retirez-le pour commander.",
  promo_code_expired: "Ce code promo a expiré. Retirez-le pour commander.",
  promo_code_used_up: "Ce code promo a déjà été utilisé le nombre de fois prévu. Retirez-le pour commander.",
  promo_code_min_order: "Le montant minimum pour ce code promo n'est pas atteint.",
  email_not_confirmed: "Confirmez d'abord votre adresse e-mail : ouvrez le lien reçu par e-mail, puis validez à nouveau.",
};

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certaines informations de la commande sont invalides." };
  const { customer, items, delivery, payment, website } = parsed.data;
  if (website) return { ok: false, error: "Commande refusée." };

  const phone = normalizeMlPhone(customer.phone);
  if (!phone) return { ok: false, error: "Numéro malien invalide : 8 chiffres, ex. 76 12 34 56." };
  if (delivery === "home" && !customer.zone_id) return { ok: false, error: "Choisissez votre zone de livraison." };

  // Catalogue de secours (identifiants non uuid) ou base non configurée : rien à enregistrer
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY || items.some((i) => !UUID.test(i.product_id))) {
    return { ok: false, fallback: true, error: "Commande transmise par WhatsApp uniquement." };
  }

  // Compte client obligatoire : la session est relue ici, et place_order revérifie auth.uid()
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { ok: false, needsLogin: true, error: "Connectez-vous pour valider votre commande : votre panier est gardé." };

  // Code promo : d'abord la vérification limitée en essais (anti-devinette), puis place_order revérifie tout
  if (customer.promo_code) {
    const check = await verifyCode(customer.promo_code, { tolerant: true });
    if (!check.ok) return { ok: false, error: `${check.error} Retirez le code pour commander sans remise.` };
  }

  try {
    // Session du client (rôle authenticated) : plus jamais la clé de service pour commander
    const { data, error } = await supabase.rpc("place_order", {
      p_customer: { ...customer, phone },
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty, color: i.color ?? "", storage: i.storage ?? "" })),
      p_delivery: delivery,
      p_payment: payment,
    });

    if (error) {
      if (error.message.includes("not_authenticated")) {
        return { ok: false, needsLogin: true, error: "Votre session a expiré. Reconnectez-vous : votre panier est gardé." };
      }
      const code = Object.keys(messages).find((k) => error.message.includes(k));
      if (code) {
        const detail =
          code === "insufficient_stock"
            ? error.details
              ? ` pour « ${error.details} ».`
              : "."
            : code === "promo_code_min_order" && error.details
              ? ` (${new Intl.NumberFormat("fr-FR").format(Number(error.details))} FCFA d'articles au moins).`
              : "";
        return { ok: false, error: messages[code] + detail };
      }
      console.error("[commande] place_order a échoué", { code: error.code, message: error.message });
      return { ok: false, fallback: true, error: "Enregistrement impossible pour le moment." };
    }

    const placed = (Array.isArray(data) ? data[0] : data) as { order_id: string; order_number: string } | undefined;
    if (!placed) return { ok: false, fallback: true, error: "Enregistrement impossible pour le moment." };

    // Récapitulatif tel qu'enregistré (prix et frais recalculés en base)
    const { data: order } = await supabase
      .from("orders")
      .select("*") // colonnes promo_code et discount absentes avant la migration 17 : lues si présentes
      .eq("id", placed.order_id)
      .single();

    updateTag(CATALOG_TAG); // le stock a changé

    const lines = ((order?.items ?? []) as { name: string; color: string | null; storage: string | null; qty: number; price: number }[]).map(
      (l) => ({ name: l.name, variant: [l.color, l.storage].filter(Boolean).join(" · ") || undefined, qty: l.qty, price: Number(l.price) }),
    );
    return {
      ok: true,
      number: placed.order_number,
      subtotal: Number(order?.subtotal ?? 0),
      discount: Number(order?.discount ?? 0),
      promoCode: order?.promo_code ?? null,
      fee: Number(order?.delivery_fee ?? 0),
      total: Number(order?.total ?? 0),
      region: order?.region ?? "",
      lines,
    };
  } catch (err) {
    console.error("[commande] Supabase injoignable", err);
    return { ok: false, fallback: true, error: "Enregistrement impossible pour le moment." };
  }
}

// --- Code promo saisi dans le panier ---------------------------------------------------

export type PromoCheck = { ok: true; code: AppliedCode } | { ok: false; error: string };

const codeReasons: Record<string, string> = {
  invalid: "Ce code n'existe pas ou n'est plus valable. Vérifiez l'orthographe.",
  expired: "Ce code a expiré.",
  used_up: "Ce code a déjà été utilisé le nombre de fois prévu.",
  too_many_attempts: "Trop d'essais de codes promo. Réessayez dans une heure.",
};

/** Empreinte de l'adresse IP du visiteur (jamais l'adresse elle-même), pour limiter les essais. */
async function clientKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip ? createHash("sha256").update(`code-promo:${ip}`).digest("hex") : null;
}

/**
 * Vérification d'un code (10 essais ratés par heure et par visiteur, en base).
 * tolerant : une panne de la vérification n'empêche pas la commande (place_order revérifie).
 */
async function verifyCode(raw: string, { tolerant = false } = {}): Promise<PromoCheck> {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { ok: false, error: codeReasons.invalid };
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "Les codes promo ne sont pas disponibles pour le moment." };
  try {
    const { data, error } = await createServiceClient().rpc("check_promo_code", { p_code: code, p_client: await clientKey() });
    if (error) throw error;
    const r = data as { ok: boolean; reason?: string; code?: string; kind?: "percent" | "amount"; value?: number; min_order?: number };
    if (!r?.ok || !r.code || !r.kind) return { ok: false, error: codeReasons[r?.reason ?? "invalid"] ?? codeReasons.invalid };
    return { ok: true, code: { code: r.code, kind: r.kind, value: Number(r.value), minOrder: Number(r.min_order ?? 0) } };
  } catch (err) {
    console.error("[code promo] vérification impossible", err);
    if (tolerant) return { ok: true, code: { code, kind: "amount", value: 0, minOrder: 0 } };
    return { ok: false, error: "Vérification impossible pour le moment. Réessayez." };
  }
}

/**
 * Vérifie un code promo (clé de service : la table des codes n'est jamais lisible
 * par le public). Renvoie seulement le type, la valeur et le minimum ; la remise
 * est recalculée et le code revérifié par place_order au moment de la commande.
 */
export async function checkPromoCode(raw: string): Promise<PromoCheck> {
  return verifyCode(raw);
}
