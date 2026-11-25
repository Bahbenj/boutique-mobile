import type { Product } from "@/data/products";

/**
 * Utilitaires purs sur les produits, sans accès aux données : utilisables dans
 * les composants client comme serveur (lib/catalog.ts est réservé au serveur).
 */

/** Seuil du badge « Stock limité ». */
export const LOW_STOCK = 3;

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

/** Photos recadrées (défaut) ou entières sur leur couleur de fond (`imageBg`, colonne image_bg). */
export const imageFit = (p: Pick<Product, "imageBg">) => (p.imageBg ? "object-contain p-[6%]" : "object-cover");
export const imageBg = (p: Pick<Product, "imageBg">) => (p.imageBg ? { backgroundColor: p.imageBg } : undefined);
