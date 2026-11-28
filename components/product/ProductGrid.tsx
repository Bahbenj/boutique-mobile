import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";
import { ProductCard } from "./ProductCard";

export const gridClass = "grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4";
const sizes = "(min-width: 1024px) 24vw, (min-width: 768px) 31vw, 48vw";

/** Grille produits de la boutique : 2 colonnes à 360 px, 4 sur desktop. */
export function ProductGrid({ products, className }: { products: Product[]; className?: string }) {
  return (
    <ul className={cn(gridClass, className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          {/* 1re rangée : 2 cartes visibles sur téléphone (priorité haute), 4 sur ordinateur */}
          <ProductCard product={p} sizes={sizes} priority={i < 2 ? "high" : i < 4 ? "eager" : undefined} />
        </li>
      ))}
    </ul>
  );
}

/** Squelette de la grille : mêmes proportions que les cartes, pas de saut à l'affichage. */
export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <ul className={cn(gridClass, className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5] rounded-card" />
      <div className="mt-3 space-y-2 px-1">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
        <div className="skeleton mt-3 h-10 rounded-full" />
      </div>
    </div>
  );
}
