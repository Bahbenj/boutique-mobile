"use client";

import { cartCount, useCart } from "@/lib/cart-store";
import { useUI } from "@/lib/ui-store";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/** Pastille du nombre d'articles. Pulse à chaque ajout (la `key` change). */
export function CartBadge({ className }: { className?: string }) {
  const count = cartCount(useCart((s) => s.items));
  const bump = useUI((s) => s.cartBump);
  const mounted = useMounted();
  if (!mounted || count === 0) return null;

  return (
    <span
      key={bump}
      aria-hidden="true"
      className={cn(
        "grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-accent-ink tabular-nums",
        bump > 0 && "animate-cart-pulse",
        className,
      )}
    >
      {count}
    </span>
  );
}

/** Libellé accessible « Panier, 2 articles ». */
export function useCartLabel(base: string) {
  const count = cartCount(useCart((s) => s.items));
  const mounted = useMounted();
  return `${base}${mounted && count ? `, ${count} article${count > 1 ? "s" : ""}` : ""}`;
}
