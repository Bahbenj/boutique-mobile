"use server";

import { z } from "zod";
import { normalizeMlPhone, phoneError } from "@/lib/phone";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Enregistre une demande de devis de réparation (formulaire de /reparation),
 * avant l'ouverture du message WhatsApp. Anti-spam en trois couches :
 *   1. champ piège invisible (rempli seulement par les robots) ;
 *   2. délai minimal entre l'affichage du formulaire et l'envoi ;
 *   3. en base : 3 demandes par heure au plus pour un même numéro.
 * Appel à create_repair_request() avec la clé de service, côté serveur seulement.
 */

const MIN_FILL_MS = 3_000; // un humain met plus de 3 s à remplir quatre champs
const MAX_AGE_MS = 24 * 3_600_000;

const requestSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(80, "80 caractères maximum."),
  phone: z.string().max(30),
  device: z.string().trim().min(2, "Indiquez le modèle du téléphone.").max(80, "80 caractères maximum."),
  issue: z.string().trim().min(3, "Décrivez la panne en quelques mots.").max(1000, "1 000 caractères maximum."),
  website: z.string().max(500).optional(), // champ piège : contrôlé plus bas (réponse neutre)
  startedAt: z.number().int(),
});

export type RepairRequestInput = z.input<typeof requestSchema>;
export type RepairRequestResult =
  | { ok: true; number: string; phone: string }
  /** fallback : enregistrement impossible (base absente ou injoignable) → envoi WhatsApp sans numéro */
  | { ok: false; error: string; fields?: Partial<Record<"name" | "phone" | "device" | "issue", string>>; fallback?: boolean };

const messages: Record<string, string> = {
  invalid_name: "Indiquez votre nom.",
  invalid_phone: phoneError,
  invalid_device: "Indiquez le modèle du téléphone.",
  invalid_issue: "Décrivez la panne en quelques mots.",
  too_many_requests: "Vous avez déjà envoyé plusieurs demandes : nous vous répondons très vite. Écrivez-nous directement sur WhatsApp si c'est urgent.",
};

export async function submitRepairRequest(input: RepairRequestInput): Promise<RepairRequestResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Certains champs sont à corriger.", fields };
  }
  const { name, device, issue, website, startedAt } = parsed.data;

  // Robots : réponse neutre, rien n'est enregistré
  const age = Date.now() - startedAt;
  if (website || age < MIN_FILL_MS || age > MAX_AGE_MS) return { ok: false, error: "Demande refusée. Réessayez dans quelques secondes." };

  const phone = normalizeMlPhone(parsed.data.phone);
  if (!phone) return { ok: false, error: phoneError, fields: { phone: phoneError } };

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, fallback: true, error: "Demande transmise par WhatsApp uniquement." };
  }

  try {
    // Visiteur connecté : demande rattachée à son compte (session vérifiée ici, jamais un identifiant du navigateur)
    const { data: auth } = await (await createClient()).auth.getClaims();
    const user_id = typeof auth?.claims?.sub === "string" ? auth.claims.sub : undefined;
    const { data, error } = await createServiceClient().rpc("create_repair_request", { p_request: { name, phone, device, issue, user_id } });
    if (error) {
      const code = Object.keys(messages).find((k) => error.message.includes(k));
      if (code) return { ok: false, error: messages[code], ...(code.startsWith("invalid_") ? { fields: { [code.slice(8)]: messages[code] } } : {}) };
      console.error("[réparation] create_repair_request a échoué", { code: error.code, message: error.message });
      return { ok: false, fallback: true, error: "Enregistrement impossible pour le moment." };
    }
    const row = (Array.isArray(data) ? data[0] : data) as { request_number: string } | undefined;
    if (!row) return { ok: false, fallback: true, error: "Enregistrement impossible pour le moment." };
    return { ok: true, number: row.request_number, phone };
  } catch (err) {
    console.error("[réparation] Supabase injoignable", err);
    return { ok: false, fallback: true, error: "Enregistrement impossible pour le moment." };
  }
}
