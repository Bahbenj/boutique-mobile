"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/** Page Stock : ajustement avec motif (historique) et seuil d'alerte. */

const adjustSchema = z.object({
  id: z.uuid(),
  stock: z.number().int().min(0, "Le stock ne peut pas être négatif.").max(100_000, "Stock trop grand."),
  note: z.string().trim().max(200, "200 caractères maximum.").optional(),
});

export async function adjustStock(input: z.input<typeof adjustSchema>): Promise<ActionResult<{ previous: number }>> {
  await requireAdmin();
  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Stock invalide." };
  const { id, stock, note } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("products").select("stock").eq("id", id).maybeSingle();
  if (!before) return { ok: false, error: "Produit introuvable." };

  // admin_set_stock : motif dans l'historique (migration 18). Sans elle, mise à jour simple.
  let { error } = await supabase.rpc("admin_set_stock", { p_product: id, p_stock: stock, p_note: note || null });
  if (error?.code === "PGRST202") ({ error } = await supabase.from("products").update({ stock }).eq("id", id));
  if (error) {
    logSupabaseError("stock", error);
    return { ok: false, error: "Le stock n'a pas été enregistré. Réessayez." };
  }
  updateTag(CATALOG_TAG); // disponibilité affichée sur le site
  refresh();
  return { ok: true, data: { previous: Number(before.stock) } };
}

export async function saveLowStockThreshold(value: number): Promise<ActionResult> {
  await requireAdmin();
  const n = z.number().int().min(0).max(1000).safeParse(value);
  if (!n.success) return { ok: false, error: "Indiquez un nombre entre 0 et 1000." };
  const supabase = await createClient();
  const { error } = await supabase.from("settings").upsert({ key: "stock", value: { low_threshold: n.data } }, { onConflict: "key" });
  if (error) {
    logSupabaseError("seuil de stock", error);
    return { ok: false, error: "Le réglage n'a pas été enregistré. Réessayez." };
  }
  refresh();
  return { ok: true };
}
