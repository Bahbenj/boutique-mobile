"use client";

import type { Product } from "@/data/products";
import { t } from "@/i18n";
import { useCart } from "./cart-store";
import { useUI } from "./ui-store";

export type Selection = { color?: string; storage?: string };

/** Prix (et ancien prix) d'un produit pour la capacité choisie. */
export function priceFor(p: Product, storage?: string) {
  const option = p.storage?.find((s) => s.label === storage) ?? p.storage?.[0];
  return { price: option?.price ?? p.price, oldPrice: option?.oldPrice ?? p.oldPrice };
}

/**
 * Ajout au panier avec retour visuel : ouvre le tiroir, fait pulser le
 * compteur et affiche une confirmation. Ne fait rien si le produit est en rupture.
 */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  const { openCart, bumpCart, showToast } = useUI.getState();

  return (p: Product, selection: Selection = {}, qty = 1) => {
    if (p.stock <= 0) return false;
    const color = selection.color ?? (p.colors?.length === 1 ? p.colors[0].name : undefined);
    const storage = selection.storage ?? p.storage?.[0]?.label;
    const variant = [color, storage].filter(Boolean).join(" · ") || undefined;

    add(
      {
        key: [p.id, color, storage].filter(Boolean).join("|"),
        productId: p.id,
        slug: p.slug,
        name: p.name,
        variant,
        price: priceFor(p, storage).price,
        image: p.images[0].src,
        maxQty: p.stock,
      },
      qty,
    );
    bumpCart();
    openCart();
    showToast({ title: t.cart.added, text: variant ? `${p.name} · ${variant}` : p.name, image: p.images[0].src });
    return true;
  };
}
