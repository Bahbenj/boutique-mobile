"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { PRODUCT_REVIEWS_TAG } from "@/lib/product-reviews";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/** Modération d'un avis produit : publier, refuser (motif), masquer, répondre au nom de la boutique. */
const schema = z.discriminatedUnion("action", [
  z.object({ id: z.uuid(), action: z.literal("publish") }),
  z.object({ id: z.uuid(), action: z.literal("hide") }),
  z.object({ id: z.uuid(), action: z.literal("reject"), text: z.string().trim().min(3, "Indiquez le motif (il est montré au client).").max(300) }),
  z.object({ id: z.uuid(), action: z.literal("reply"), text: z.string().trim().max(600, "600 caractères maximum.") }),
]);

export async function moderateProductReview(input: z.input<typeof schema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Demande invalide." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_moderate_product_review", { p_id: d.id, p_action: d.action, p_text: "text" in d ? d.text.replace(/<[^>]*>/g, "") : null });
  if (error) {
    logSupabaseError("modération d'avis", error);
    return { ok: false, error: /not_found/.test(error.message) ? "Avis introuvable (supprimé par son auteur ?)." : "Le changement n'a pas été enregistré. Réessayez." };
  }
  updateTag(PRODUCT_REVIEWS_TAG); // fiches produit
  updateTag(CATALOG_TAG); // notes des cartes produit
  refresh();
  return { ok: true };
}
