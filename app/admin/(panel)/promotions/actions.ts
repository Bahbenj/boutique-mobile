"use server";

import { refresh, updateTag } from "next/cache";
import { promoCodeSchema, promotionSchema, type PromoCodeInput, type PromotionInput } from "@/lib/admin/promo-schema";
import { fieldErrors, type ActionResult } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/** Promotions (prix remisés sur le site) et codes promo (saisis par le client). */

const UUID = /^[0-9a-f-]{36}$/i;
const FAILED = "Le changement n'a pas été enregistré. Réessayez.";

export async function savePromotion(input: PromotionInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Il manque quelque chose : vérifiez les champs signalés.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("promotions").update(data).eq("id", id) : await supabase.from("promotions").insert(data);
  if (error) {
    logSupabaseError("promotion", error);
    return { ok: false, error: FAILED };
  }
  updateTag(CATALOG_TAG); // prix affichés sur le site
  refresh();
  return { ok: true };
}

export async function setPromotionActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(id) || typeof active !== "boolean") return { ok: false, error: "Promotion introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: FAILED };
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Promotion introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) return { ok: false, error: FAILED };
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function savePromoCode(input: PromoCodeInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = promoCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Il manque quelque chose : vérifiez les champs signalés.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("promo_codes").update(data).eq("id", id) : await supabase.from("promo_codes").insert(data);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ce code existe déjà.", fields: { code: "Ce code existe déjà : choisissez-en un autre." } };
    logSupabaseError("code promo", error);
    return { ok: false, error: FAILED };
  }
  refresh();
  return { ok: true };
}

export async function setPromoCodeActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(id) || typeof active !== "boolean") return { ok: false, error: "Code introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: FAILED };
  refresh();
  return { ok: true };
}

/** Les commandes déjà passées gardent le code et la remise (copie dans la commande). */
export async function deletePromoCode(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!UUID.test(id)) return { ok: false, error: "Code introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) return { ok: false, error: FAILED };
  refresh();
  return { ok: true };
}
