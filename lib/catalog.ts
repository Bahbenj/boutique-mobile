import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { categories as staticCategories, products as staticProducts, type Category, type Product } from "@/data/products";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Utilitaires purs, aussi utilisés par les composants client (lib/product-helpers.ts)
export { LOW_STOCK, discountPercent, hasPriceRange, stockState, type StockState } from "@/lib/product-helpers";

/**
 * Accès au catalogue du site public. Les pages n'importent jamais data/products.ts.
 *
 * Source : Supabase (tables categories et products), lue avec la clé publique :
 * la Row Level Security ne laisse voir que les produits en ligne (is_active).
 * Cache : `"use cache"` étiqueté CATALOG_TAG, invalidé à chaque modification
 * dans l'admin (produits, catégories, statut de commande) et après chaque
 * commande (stock). Secours : data/products.ts si Supabase n'est pas configuré
 * ou injoignable ; ce repli n'est gardé que quelques minutes, pour revenir vite
 * aux vraies données.
 */

export const CATALOG_TAG = "catalog";

type Catalog = { categories: Category[]; products: Product[]; source: "db" | "static" };

/** Visuel provisoire quand une catégorie ou un produit n'a pas encore de photo. */
const PLACEHOLDERS = new Set(["smartphones", "ecouteurs-casques", "montres", "accessoires", "protections", "gadgets"]);
const placeholderFor = (slug: string) => `/photos/provisoire/${PLACEHOLDERS.has(slug) ? slug : "gadgets"}.svg`;

type DbRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  price: number;
  old_price: number | null;
  stock: number;
  condition: Product["condition"];
  grade: string | null;
  battery: number | null;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  images: string[];
  variants: { colors?: { name: string; hex: string }[]; storage?: { label: string; price: number; old_price?: number | null }[] } | null;
  highlights: string[];
  specs: [string, string][];
  tag: string | null;
  free_delivery: boolean | null;
  image_bg: string | null;
  category: { slug: string } | null;
};

function toProduct(r: DbRow): Product {
  const categorySlug = r.category?.slug ?? "";
  const images = (r.images ?? []).filter(Boolean);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand ?? "",
    category: categorySlug,
    condition: r.condition,
    price: Number(r.price),
    ...(r.old_price != null ? { oldPrice: Number(r.old_price) } : {}),
    images: (images.length ? images : [placeholderFor(categorySlug)]).map((src, i) => ({
      src,
      alt: images.length ? (i === 0 ? r.name : `${r.name}, photo ${i + 1}`) : `${r.name} (visuel provisoire)`,
    })),
    ...(r.variants?.colors?.length ? { colors: r.variants.colors } : {}),
    ...(r.variants?.storage?.length
      ? {
          storage: r.variants.storage.map((s) => ({
            label: s.label,
            price: Number(s.price),
            ...(s.old_price != null ? { oldPrice: Number(s.old_price) } : {}),
          })),
        }
      : {}),
    stock: r.stock,
    ...(r.grade ? { grade: r.grade as Product["grade"] } : {}),
    ...(r.battery != null ? { battery: r.battery } : {}),
    highlights: r.highlights ?? [],
    specs: r.specs ?? [],
    description: r.description ?? "",
    isNew: r.is_new,
    ...(r.tag ? { tag: r.tag } : {}),
    ...(r.free_delivery ? { freeDelivery: true } : {}),
    ...(r.image_bg ? { imageBg: r.image_bg } : {}),
    isFeatured: r.is_featured,
    isActive: r.is_active,
  };
}

const staticCatalog = (): Catalog => ({ categories: staticCategories, products: staticProducts, source: "static" });

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);

  if (!isSupabaseConfigured) {
    cacheLife("max"); // aucune base : les données statiques ne changent qu'au déploiement
    return staticCatalog();
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [cats, prods] = await Promise.all([
    supabase.from("categories").select("id, name, slug, description, image, position").order("position").order("name"),
    supabase
      .from("products")
      .select(
        "id, name, slug, description, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs, tag, free_delivery, image_bg, created_at, category:categories(slug)",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  const error = cats.error ?? prods.error;
  if (error) {
    // Base injoignable ou migration manquante : le site reste en ligne avec le catalogue statique
    console.error("[catalogue] Supabase illisible, repli sur data/products.ts :", error.message);
    cacheLife("minutes");
    return staticCatalog();
  }

  cacheLife("hours"); // invalidé immédiatement par l'admin (updateTag), sinon relu au moins chaque jour
  const products = (prods.data as unknown as DbRow[]).map(toProduct);
  const firstImage = (slug: string) => products.find((p) => p.category === slug && !p.images[0].src.includes("/provisoire/"))?.images[0].src;
  const categories: Category[] = (cats.data ?? []).map((c) => ({
    slug: c.slug,
    label: c.name,
    title: c.name,
    description: c.description ?? "",
    image: c.image || firstImage(c.slug) || placeholderFor(c.slug),
    alt: c.name,
  }));
  return { categories, products, source: "db" };
}

const active = async () => (await getCatalog()).products.filter((p) => p.isActive);

export async function getProducts(category?: string): Promise<Product[]> {
  const list = await active();
  return category ? list.filter((p) => p.category === category) : list;
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return (await active()).filter((p) => p.isFeatured).slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await active()).find((p) => p.slug === slug);
}

export async function getCategories() {
  const { categories } = await getCatalog();
  const list = await active();
  return categories.map((c) => ({ ...c, count: list.filter((p) => p.category === c.slug).length }));
}

/** Puces de la boutique : « Tout » + un rayon par catégorie, avec leur nombre de produits. */
export async function getCategoryChips() {
  const cats = await getCategories();
  const all = (await active()).length;
  return [{ label: "Tout", count: all }, ...cats.map((c) => ({ slug: c.slug, label: c.label, count: c.count }))];
}

export async function getCategory(slug: string) {
  return (await getCatalog()).categories.find((c) => c.slug === slug);
}
