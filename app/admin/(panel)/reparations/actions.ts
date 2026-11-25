"use server";

import { refresh } from "next/cache";
import { repairUpdateSchema, type RepairUpdate } from "@/lib/admin/repairs-shared";
import { fieldErrors, type ActionResult } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Suivi d'une demande de réparation : statut, prix du devis, notes internes.
 * Seules ces trois colonnes sont modifiables par l'admin (GRANT, migration 13) :
 * les coordonnées et la panne saisies par le client restent intactes.
 */
export async function updateRepair(input: RepairUpdate): Promise<ActionResult> {
  await requireAdmin();
  const parsed = repairUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const { id, ...patch } = parsed.data;
  if (!Object.keys(patch).length) return { ok: true };

  const supabase = await createClient();
  const { data, error } = await supabase.from("repair_requests").update(patch).eq("id", id).select("id").maybeSingle();
  if (error) {
    logSupabaseError("suivi de réparation", error);
    return { ok: false, error: "Non enregistré : " + error.message };
  }
  if (!data) return { ok: false, error: "Demande introuvable." };
  refresh();
  return { ok: true };
}
