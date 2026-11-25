"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isAllowedImage, storagePath } from "@/lib/admin/catalog";
import {
  bulkSchema,
  fieldErrors,
  productSchema,
  quickUpdateSchema,
  slugify,
  type ActionResult,
  type BulkInput,
  type DbProduct,
  type ProductInput,
} from "@/lib/admin/schema";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog"; // cache du site public, invalidé à chaque modification
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * Actions produits. Chacune revérifie le rôle admin (requireAdmin) et valide
 * les données avec zod : rien de ce qu'envoie le navigateur n'est pris tel quel.
 * Les messages d'erreur sont écrits pour le commerçant, jamais techniques.
 */

function done() {
  updateTag(CATALOG_TAG);
  refresh();
}

const uuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** Erreur base → message compréhensible (le détail technique part dans les journaux du serveur). */
function dbError(context: string, error: { code?: string; message: string }): ActionResult & { ok: false } {
  logSupabaseError(context, error);
  if (error.code === "23505") return { ok: false, error: "Ce lien de page est déjà pris par un autre produit.", fields: { slug: "Déjà utilisé par un autre produit." } };
  if (error.code === "23503") return { ok: false, error: "La catégorie choisie n'existe plus. Choisissez-en une autre." };
  if (error.code === "23514" && /promo/.test(error.message)) return { ok: false, error: "Le prix promo doit être inférieur au prix normal." };
  if (error.code === "42501") return { ok: false, error: "Vous n'avez pas le droit de faire cette modification." };
  if (/fetch|network|timeout/i.test(error.message)) return { ok: false, error: "Connexion impossible. Vérifiez le réseau et réessayez." };
  return { ok: false, error: "L'enregistrement n'a pas abouti. Réessayez dans un instant." };
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

/** Lien de page libre à partir d'une base (« casque », « casque-2 »…). */
async function freeSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string, exceptId?: string) {
  const { data: taken } = await supabase.from("products").select("id, slug").like("slug", `${base}%`);
  const used = new Set((taken ?? []).filter((r) => r.id !== exceptId).map((r) => r.slug as string));
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.images.some((u) => !isAllowedImage(u))) return { ok: false, error: "Une photo ne vient pas de la boutique : retirez-la et ajoutez-la à nouveau.", fields: { images: "Photo non autorisée." } };
  if (data.condition === "neuf") Object.assign(data, { grade: null, battery: null });

  const supabase = await createClient();
  // Lien de page déjà pris par un autre produit : on en trouve un libre au lieu de bloquer
  data.slug = await freeSlug(supabase, data.slug, id ?? undefined);

  if (id) {
    if (!uuid(id)) return { ok: false, error: "Produit introuvable." };
    const { data: before } = await supabase.from("products").select("images").eq("id", id).maybeSingle();
    const { error } = await supabase.from("products").update(data).eq("id", id);
    if (error) return dbError("enregistrement produit", error);
    const removed = ((before?.images as string[]) ?? []).filter((u) => !data.images.includes(u));
    await deleteOrphanImages(supabase, removed);
    done();
    return { ok: true, data: { id } };
  }

  const { data: created, error } = await supabase.from("products").insert(data).select("id").single();
  if (error) return dbError("création produit", error);
  done();
  return { ok: true, data: { id: created.id as string } };
}

export type QuickPatch = { price?: number; stock?: number; is_active?: boolean; is_featured?: boolean };

/**
 * Modification rapide depuis la liste (prix, stock, en vente, mise en avant).
 * Renvoie les valeurs d'avant : le bouton « Annuler » les remet telles quelles.
 */
export async function quickUpdateProduct(input: { id: string } & QuickPatch): Promise<ActionResult<{ previous: QuickPatch; notice?: string }>> {
  await requireAdmin();
  const parsed = quickUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...patch } = parsed.data;
  if (!Object.keys(patch).length) return { ok: true, data: { previous: {} } };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("products")
    .select("price, stock, is_active, is_featured, promo_price, variants")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "Produit introuvable : il a peut-être été supprimé." };

  const previous: QuickPatch = {};
  for (const key of Object.keys(patch) as (keyof QuickPatch)[]) Object.assign(previous, { [key]: current[key] == null ? current[key] : key === "price" ? Number(current[key]) : current[key] });

  let notice: string | undefined;
  const update: Record<string, unknown> = { ...patch };
  if (patch.price !== undefined) {
    if ((current.variants as DbProduct["variants"])?.storage?.length) return { ok: false, error: "Ce produit a un prix par capacité : modifiez-le dans sa fiche." };
    if (patch.price <= 0) return { ok: false, error: "Indiquez un prix supérieur à 0." };
    // Un prix promo qui n'est plus inférieur au nouveau prix n'a plus de sens : promo arrêtée
    if (current.promo_price != null && Number(current.promo_price) >= patch.price) {
      Object.assign(update, { promo_price: null, promo_starts_at: null, promo_ends_at: null });
      notice = "La promo a été arrêtée : son prix n'était plus inférieur au nouveau prix.";
    }
  }

  const { error } = await supabase.from("products").update(update).eq("id", id);
  if (error) return dbError("modification rapide produit", error);
  done();
  return { ok: true, data: { previous, notice } };
}

/** Actions groupées : masquer, afficher, changer de catégorie, remise en %, fin de promo. */
export async function bulkUpdateProducts(input: BulkInput): Promise<ActionResult<{ count: number; skipped: number }>> {
  await requireAdmin();
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const req = parsed.data;
  const supabase = await createClient();

  if (req.action === "hide" || req.action === "show" || req.action === "category" || req.action === "end-promo") {
    const patch =
      req.action === "hide"
        ? { is_active: false }
        : req.action === "show"
          ? { is_active: true }
          : req.action === "category"
            ? { category_id: req.category_id }
            : { promo_price: null, promo_starts_at: null, promo_ends_at: null };
    const { data, error } = await supabase.from("products").update(patch).in("id", req.ids).select("id");
    if (error) return dbError("action groupée produits", error);
    done();
    return { ok: true, data: { count: data?.length ?? 0, skipped: 0 } };
  }

  // Remise : prix promo = prix − X %, arrondi à 5 FCFA, produit par produit
  // (les produits à prix par capacité ou sans prix sont ignorés)
  const { data: rows, error: readError } = await supabase.from("products").select("id, price, variants").in("id", req.ids);
  if (readError) return dbError("lecture remise groupée", readError);
  let count = 0;
  let skipped = 0;
  for (const r of rows ?? []) {
    const price = Number(r.price);
    if ((r.variants as DbProduct["variants"])?.storage?.length || price <= 0) {
      skipped++;
      continue;
    }
    const promo = Math.max(0, Math.round((price * (100 - req.percent)) / 100 / 5) * 5);
    if (promo >= price) {
      skipped++;
      continue;
    }
    const { error } = await supabase
      .from("products")
      .update({ promo_price: promo, promo_starts_at: req.promo_starts_at, promo_ends_at: req.promo_ends_at })
      .eq("id", r.id);
    if (error) return dbError("remise groupée", error);
    count++;
  }
  done();
  return { ok: true, data: { count, skipped } };
}

/** Copie masquée (à vérifier avant mise en vente), puis ouverture de la copie. */
export async function duplicateProduct(id: string) {
  await requireAdmin();
  if (!uuid(id)) return;
  const supabase = await createClient();
  const { data: source } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (!source) return;

  const slug = await freeSlug(supabase, slugify(`${source.slug}-copie`));
  const copy: Partial<DbProduct> = { ...(source as DbProduct) };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  const { data: created, error } = await supabase
    .from("products")
    .insert({ ...copy, name: `${source.name} (copie)`.slice(0, 120), slug, is_active: false, is_featured: false })
    .select("id")
    .single();
  if (error) {
    logSupabaseError("duplication produit", error);
    throw new Error("La copie n'a pas pu être créée. Réessayez.");
  }
  done();
  redirect(`/admin/produits/${created.id}?copie=1`);
}

/** Suppression définitive (la fiche propose d'abord de masquer le produit). */
export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid(id)) return { ok: false, error: "Produit introuvable." };
  const supabase = await createClient();
  const { data: deleted, error } = await supabase.from("products").delete().eq("id", id).select("images").maybeSingle();
  if (error) return dbError("suppression produit", error);
  if (!deleted) return { ok: false, error: "Produit introuvable : il a peut-être déjà été supprimé." };
  await deleteOrphanImages(supabase, deleted.images as string[]);
  done();
  return { ok: true };
}
