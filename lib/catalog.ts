import { categories, products, type CategorySlug, type Product } from "@/data/products";

/**
 * Accès au catalogue. Seul fichier à modifier pour brancher une vraie source
 * (API, Supabase…) : les pages n'importent jamais data/products.ts directement.
 * Les produits inactifs (isActive = false) ne sortent jamais d'ici.
 */

/** Seuil du badge « Stock limité ». */
export const LOW_STOCK = 3;

const active = () => products.filter((p) => p.isActive);

export async function getProducts(category?: CategorySlug): Promise<Product[]> {
  return category ? active().filter((p) => p.category === category) : active();
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return active()
    .filter((p) => p.isFeatured)
    .slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return active().find((p) => p.slug === slug);
}

export async function getCategories() {
  return categories.map((c) => ({ ...c, count: active().filter((p) => p.category === c.slug).length }));
}

/** Puces de la boutique : « Tout » + un rayon par catégorie, avec leur nombre de produits. */
export async function getCategoryChips() {
  const cats = await getCategories();
  const all = cats.reduce((n, c) => n + c.count, 0);
  return [{ label: "Tout", count: all }, ...cats.map((c) => ({ slug: c.slug, label: c.label, count: c.count }))];
}

export async function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

/** Remise en % arrondie, ou null. */
export function discountPercent(price: number, oldPrice?: number) {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round((1 - price / oldPrice) * 100);
}

/** Plusieurs capacités = prix « à partir de ». */
export const hasPriceRange = (p: Product) => (p.storage?.length ?? 0) > 1;

export type StockState = "out" | "low" | "ok";
export function stockState(stock: number): StockState {
  if (stock <= 0) return "out";
  return stock <= LOW_STOCK ? "low" : "ok";
}
