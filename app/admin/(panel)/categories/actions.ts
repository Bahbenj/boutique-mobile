"use server";

import { refresh, updateTag } from "next/cache";
import { isAllowedImage, storagePath } from "@/lib/admin/catalog";
import { categorySchema, fieldErrors, type ActionResult, type CategoryInput } from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Actions catégories : création, modification, suppression, ordre d'affichage. */

function done() {
  updateTag("catalog");
  refresh();
}

async function removeImage(supabase: Awaited<ReturnType<typeof createClient>>, url: string | null | undefined) {
  const path = url ? storagePath(url) : null;
  if (path) await supabase.storage.from("catalog").remove([path]);
}

export async function saveCategory(input: CategoryInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const { id, ...data } = parsed.data;
  if (data.image && !isAllowedImage(data.image)) return { ok: false, error: "Photo non autorisée.", fields: { image: "Photo non autorisée." } };

  const supabase = await createClient();
  let error;
  if (id) {
    const { data: before } = await supabase.from("categories").select("image").eq("id", id).maybeSingle();
    ({ error } = await supabase.from("categories").update(data).eq("id", id));
    if (!error && before?.image && before.image !== data.image) await removeImage(supabase, before.image);
  } else {
    // Nouvelle catégorie : placée en dernier
    const { data: last } = await supabase.from("categories").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    ({ error } = await supabase.from("categories").insert({ ...data, position: (last?.position ?? -1) + 1 }));
  }
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Ce lien est déjà utilisé.", fields: { slug: "Déjà utilisé par une autre catégorie." } };
    return { ok: false, error: "Enregistrement impossible : " + error.message };
  }
  done();
  return { ok: true };
}

/** Les produits de la catégorie ne sont pas supprimés : ils deviennent « sans catégorie ». */
export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Catégorie introuvable." };
  const supabase = await createClient();
  const { data: deleted, error } = await supabase.from("categories").delete().eq("id", id).select("image").maybeSingle();
  if (error) return { ok: false, error: "Suppression impossible : " + error.message };
  if (!deleted) return { ok: false, error: "Catégorie introuvable." };
  await removeImage(supabase, deleted.image);
  done();
  return { ok: true };
}

/** Enregistre l'ordre d'affichage complet (liste des id dans l'ordre voulu). */
export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  if (!Array.isArray(ids) || ids.length > 200 || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id)))
    return { ok: false, error: "Ordre invalide." };
  const supabase = await createClient();
  const results = await Promise.all(ids.map((id, position) => supabase.from("categories").update({ position }).eq("id", id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: "Ordre non enregistré : " + failed.error.message };
  done();
  return { ok: true };
}
