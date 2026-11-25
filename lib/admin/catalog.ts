import "server-only";
import { requireAdmin } from "@/lib/auth";
import { supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { DbCategory, DbProduct, ProductStatusFilter } from "./schema";

/** Lectures du catalogue pour l'admin (session admin, soumises à la RLS). */

export type ProductFilters = {
  q?: string;
  categorie?: string; // id, ou "aucune"
  statut?: ProductStatusFilter;
  tri?: "recent" | "nom" | "stock" | "prix";
};

import { LOW_STOCK_ADMIN } from "./stock-shared";
export { LOW_STOCK_ADMIN };


export async function listProducts(filters: ProductFilters) {
  await requireAdmin();
  const supabase = await createClient();
  let query = supabase.from("products").select("*", { count: "exact" });

  // Recherche : retire les caractères qui ont un sens dans la syntaxe PostgREST
  const q = filters.q?.replace(/[,()%*\\]/g, " ").trim();
  if (q) query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,slug.ilike.%${q}%`);

  if (filters.categorie === "aucune") query = query.is("category_id", null);
  else if (filters.categorie) query = query.eq("category_id", filters.categorie);

  switch (filters.statut) {
    case "actifs":
    case "en-vente":
      query = query.eq("is_active", true);
      break;
    case "inactifs":
    case "masques":
      query = query.eq("is_active", false);
      break;
    case "promo":
      query = query.not("promo_price", "is", null);
      break;
    case "sans-prix":
      query = query.lte("price", 0);
      break;
    case "rupture":
      query = query.eq("stock", 0);
      break;
    case "faible":
      query = query.gt("stock", 0).lte("stock", LOW_STOCK_ADMIN);
      break;
    case "vedettes":
      query = query.eq("is_featured", true);
      break;
  }

  switch (filters.tri) {
    case "nom":
      query = query.order("name");
      break;
    case "stock":
      query = query.order("stock").order("name");
      break;
    case "prix":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.limit(300);
  if (error) throw new Error(error.message);
  // now : heure de lecture, pour savoir quelles promos sont en cours (pas d'horloge au rendu)
  return { products: (data ?? []) as DbProduct[], count: count ?? 0, now: Date.now() };
}

export async function getProduct(id: string) {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  return (data as DbProduct | null) ?? null;
}

export async function listCategories() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image, position, products(count)")
    .order("position")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ products, ...c }) => ({
    ...(c as DbCategory),
    productCount: (products as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

// --- Photos ----------------------------------------------------------------------

const PUBLIC_PREFIX = "/storage/v1/object/public/catalog/";

/** Chemin dans le bucket « catalog » d'une URL publique, ou null (photo externe). */
export function storagePath(url: string) {
  if (!supabaseUrl || !url.startsWith(supabaseUrl + PUBLIC_PREFIX)) return null;
  return decodeURIComponent(url.slice((supabaseUrl + PUBLIC_PREFIX).length));
}

/** Fichiers du site (public/photos, public/brand) : visuels provisoires et photos optimisées. */
const LOCAL_IMAGE = /^\/(photos|brand)\/[\w\-/]+\.(webp|avif|jpe?g|png|svg)$/;

/** Seules nos photos (bucket catalog, dossiers du site) et les placeholders Unsplash sont acceptés. */
export function isAllowedImage(url: string) {
  return storagePath(url) !== null || LOCAL_IMAGE.test(url) || url.startsWith("https://images.unsplash.com/");
}
