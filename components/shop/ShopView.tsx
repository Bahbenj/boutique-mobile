import Link from "next/link";
import type { ReactNode } from "react";
import type { CategorySlug, Product } from "@/data/products";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/product/ProductGrid";

type Chip = { slug?: CategorySlug; label: string; count: number };

/** En-tête de boutique : titre, chapô, puces de rayons (défilement horizontal sur mobile). */
export function ShopHeader({
  title,
  lead,
  chips,
}: {
  title: ReactNode;
  lead: ReactNode;
  chips: ReactNode;
}) {
  return (
    <header>
      <h1 className="text-[clamp(2.75rem,10vw,5.5rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
        {title}
        <span className="text-accent">.</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted sm:text-lg">{lead}</p>
      <div className="-mx-4 mt-8 px-4 sm:mx-0 sm:px-0">{chips}</div>
    </header>
  );
}

export function CategoryChips({ chips, active }: { chips: Chip[]; active?: CategorySlug }) {
  return (
    <nav aria-label={t.shop.filters} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {chips.map((c) => {
        const current = c.slug === active;
        return (
          <Link
            key={c.label}
            href={c.slug ? `/boutique/${c.slug}` : "/boutique"}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
              current ? "bg-accent text-on-accent" : "bg-surface text-fg shadow-soft hover:bg-fg/5",
            )}
          >
            {c.label}
            <span className={cn("tabular-nums", current ? "text-on-accent" : "text-muted")}>{c.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Page boutique complète (toutes catégories ou un rayon). */
export function ShopView({
  title,
  lead,
  products,
  chips,
  active,
}: {
  title: string;
  lead: string;
  products: Product[];
  chips: Chip[];
  active?: CategorySlug;
}) {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <ShopHeader title={title} lead={lead} chips={<CategoryChips chips={chips} active={active} />} />
      <p className="mt-8 mb-5 text-sm font-medium text-muted">{t.shop.count(products.length)}</p>
      <h2 className="sr-only">Produits</h2>
      {products.length ? <ProductGrid products={products} /> : <p className="py-16 text-center text-muted">{t.shop.empty}</p>}
    </Container>
  );
}
