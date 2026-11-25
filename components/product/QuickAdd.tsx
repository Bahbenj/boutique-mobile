"use client";

import Link from "next/link";
import type { Product } from "@/data/products";
import { t } from "@/i18n";
import { useAddToCart } from "@/lib/use-add-to-cart";
import { buttonClasses } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/icons";

/**
 * Action sous une carte produit : « Ajouter » si aucun choix n'est requis,
 * « Choisir » (vers la fiche) s'il faut une couleur / capacité, désactivé en rupture.
 */
export function QuickAdd({ product: p }: { product: Product }) {
  const addToCart = useAddToCart();
  const cls = buttonClasses("light", "sm", "mt-3 h-10 w-full ring-1 ring-line hover:bg-accent hover:text-on-accent hover:ring-accent");

  if (p.stock <= 0) {
    return (
      <button type="button" disabled className={cls}>
        {t.product.outOfStock}
      </button>
    );
  }
  if ((p.colors?.length ?? 0) > 1 || (p.storage?.length ?? 0) > 1) {
    return (
      <Link href={`/produit/${p.slug}`} className={cls} aria-label={`${t.product.choose} : ${p.name}`}>
        {t.product.choose}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => addToCart(p)} className={cls} aria-label={`${t.product.addToCart} : ${p.name}`}>
      <IconPlus size={16} />
      {t.product.add}
    </button>
  );
}
