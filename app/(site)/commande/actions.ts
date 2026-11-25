"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { paymentMethodIds } from "@/config/site";
import { CATALOG_TAG } from "@/lib/catalog";
import { normalizeMlPhone } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/supabase/env";
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
  | { ok: true; number: string; subtotal: number; fee: number; total: number; region: string; lines: PlacedLine[] }
  /** fallback : enregistrement impossible (base absente ou injoignable) → envoi WhatsApp sans numéro */
  | { ok: false; error: string; fallback?: boolean };

const messages: Record<string, string> = {
  invalid_items: "Votre panier est vide ou trop grand.",
  invalid_qty: "Une quantité est invalide.",
  product_unavailable: "Un produit de votre panier n'est plus disponible. Retirez-le puis réessayez.",
  invalid_variant: "Une couleur ou une capacité n'est plus proposée. Retirez le produit puis ajoutez-le à nouveau.",
  insufficient_stock: "Stock insuffisant",
  invalid_delivery: "Ce mode de livraison n'est plus proposé.",
  invalid_zone: "Cette zone de livraison n'est plus desservie. Choisissez-en une autre.",
  invalid_payment: "Ce mode de paiement n'est plus proposé. Choisissez-en un autre.",
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

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("place_order", {
      p_customer: { ...customer, phone },
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty, color: i.color ?? "", storage: i.storage ?? "" })),
      p_delivery: delivery,
      p_payment: payment,
    });

    if (error) {
      const code = Object.keys(messages).find((k) => error.message.includes(k));
      if (code) {
        const detail = code === "insufficient_stock" && error.details ? ` pour « ${error.details} ».` : code === "insufficient_stock" ? "." : "";
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
      .select("number, subtotal, delivery_fee, total, region, items")
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
