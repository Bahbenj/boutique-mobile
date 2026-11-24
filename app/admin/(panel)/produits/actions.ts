"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isAllowedImage, storagePath } from "@/lib/admin/catalog";
import {
  fieldErrors,
  productSchema,
  quickUpdateSchema,
  slugify,
  type ActionResult,
  type DbProduct,
  type ProductInput,
} from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Actions produits. Chacune revérifie le rôle admin (requireAdmin) et valide
 * les données avec zod : rien de ce qu'envoie le navigateur n'est pris tel quel.
 */

const CATALOG_TAG = "catalog"; // cache du site public (branché à l'étape 4)

function done() {
  updateTag(CATALOG_TAG);
  refresh();
}

const uuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

function dbError(error: { code?: string; message: string }): ActionResult & { ok: false } {
  if (error.code === "23505") return { ok: false, error: "Ce lien (slug) est déjà utilisé.", fields: { slug: "Déjà utilisé par un autre produit." } };
  if (error.code === "23503") return { ok: false, error: "Catégorie introuvable." };
  return { ok: false, error: "Enregistrement impossible : " + error.message };
}

/** Supprime du bucket les photos qui ne sont plus utilisées par aucun produit. */
async function deleteOrphanImages(supabase: Awaited<ReturnType<typeof createClient>>, urls: string[]) {
  const candidates = urls.filter((u) => storagePath(u));
  if (!candidates.length) return;
  const { data: stillUsed } = await supabase.from("products").select("images").overlaps("images", candidates);
  const used = new Set((stillUsed ?? []).flatMap((r) => r.images as string[]));
  const paths = candidates.filter((u) => !used.has(u)).map((u) => storagePath(u)!);
  if (paths.length) await supabase.storage.from("catalog").remove(paths);
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.images.some((u) => !isAllowedImage(u))) return { ok: false, error: "Photo d'origine non autorisée.", fields: { images: "Photo non autorisée." } };
  if (data.condition === "neuf") Object.assign(data, { grade: null, battery: null });

  const supabase = await createClient();
  if (id) {
    if (!uuid(id)) return { ok: false, error: "Produit introuvable." };
    const { data: before } = await supabase.from("products").select("images").eq("id", id).maybeSingle();
    const { error } = await supabase.from("products").update(data).eq("id", id);
    if (error) return dbError(error);
    const removed = ((before?.images as string[]) ?? []).filter((u) => !data.images.includes(u));
    await deleteOrphanImages(supabase, removed);
    done();
    return { ok: true, data: { id } };
  }

  const { data: created, error } = await supabase.from("products").insert(data).select("id").single();
  if (error) return dbError(error);
  done();
  return { ok: true, data: { id: created.id as string } };
}

/** Mise à jour rapide depuis la liste (prix et/ou stock). */
export async function quickUpdateProduct(input: { id: string; price?: number; stock?: number }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = quickUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...patch } = parsed.data;
  const supabase = await createClient();

  if (patch.price !== undefined) {
    const { data: current } = await supabase.from("products").select("old_price, variants").eq("id", id).maybeSingle();
    if (!current) return { ok: false, error: "Produit introuvable." };
    if ((current.variants as DbProduct["variants"])?.storage?.length)
      return { ok: false, error: "Prix défini par capacité : modifiez-le dans la fiche." };
    // Un ancien prix devenu inférieur au nouveau prix n'a plus de sens : retiré
    if (current.old_price != null && Number(current.old_price) <= patch.price) Object.assign(patch, { old_price: null });
  }

  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return dbError(error);
  done();
  return { ok: true };
}

export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid(id)) return { ok: false, error: "Produit introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ is_active: active }).eq("id", id);
  if (error) return dbError(error);
  done();
  return { ok: true };
}

/** Copie hors ligne (à vérifier avant publication), puis ouverture de la copie. */
export async function duplicateProduct(id: string) {
  await requireAdmin();
  if (!uuid(id)) return;
  const supabase = await createClient();
  const { data: source } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!source) return;

  const base = slugify(`${source.slug}-copie`);
  const { data: taken } = await supabase.from("products").select("slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;

  const copy: Partial<DbProduct> = { ...(source as DbProduct) };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  const { data: created, error } = await supabase
    .from("products")
    .insert({ ...copy, name: `${source.name} (copie)`.slice(0, 120), slug, is_active: false, is_featured: false })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  done();
  redirect(`/admin/produits/${created.id}?copie=1`);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid(id)) return { ok: false, error: "Produit introuvable." };
  const supabase = await createClient();
  const { data: deleted, error } = await supabase.from("products").delete().eq("id", id).select("images").maybeSingle();
  if (error) return dbError(error);
  if (!deleted) return { ok: false, error: "Produit introuvable." };
  await deleteOrphanImages(supabase, deleted.images as string[]);
  done();
  return { ok: true };
}
