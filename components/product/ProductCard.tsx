import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";
import { t } from "@/i18n";
import { hasPriceRange, imageBg, imageFit } from "@/lib/product-helpers";
import { cn } from "@/lib/utils";
import { Price } from "./Price";
import { LowStockBadge, ProductBadges, productBadges } from "./ProductBadges";
import { QuickAdd } from "./QuickAdd";
import { RatingInline } from "./Stars";

/** Carte produit des grilles (accueil, boutique) : visuel, badges, prix, ajout rapide. */
export function ProductCard({ product: p, sizes, className }: { product: Product; sizes?: string; className?: string }) {
  const soldOut = p.stock <= 0;
  const href = `/produit/${p.slug}`;
  const meta = [
    p.brand,
    p.battery ? `${t.product.battery} ${p.battery} %` : p.colors && p.colors.length > 1 && t.product.colors(p.colors.length),
  ].filter(Boolean);

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      {/* Le visuel duplique le lien du titre : retiré du clavier et des lecteurs d'écran */}
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[4/5] overflow-hidden rounded-card bg-raised">
        <Image
          src={p.images[0].src}
          alt=""
          fill
          sizes={sizes ?? "(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 80vw"}
          quality={75}
          style={imageBg(p)}
          className={cn(
            imageFit(p),
            "transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]",
            soldOut && "opacity-50 grayscale",
          )}
        />
        <ProductBadges product={p} compact className="absolute inset-x-2.5 top-2.5 sm:inset-x-3 sm:top-3" />
        <LowStockBadge stock={p.stock} className="absolute start-2.5 bottom-2.5 sm:start-3 sm:bottom-3" />
      </Link>
      <div className="mt-3 flex flex-1 flex-col px-1">
        <p className="text-xs font-semibold text-muted">{meta.join(" · ")}</p>
        <h3 className="mt-0.5 text-[1.0625rem] leading-snug font-bold tracking-tight">
          <Link href={href} className="hover:underline hover:decoration-accent hover:decoration-2 hover:underline-offset-4">
            {p.name}
          </Link>
        </h3>
        {/* Les badges du visuel sont masqués aux lecteurs d'écran : on les répète ici */}
        <p className="sr-only">
          {[...productBadges({ product: p }).map((b) => b.label), p.grade].filter(Boolean).join(", ")}
        </p>
        {p.rating && <RatingInline average={p.rating.average} count={p.rating.count} className="mt-1" />}
        <Price price={p.price} oldPrice={p.oldPrice} from={hasPriceRange(p)} className="mt-1" />
        <div className="mt-auto">
          <QuickAdd product={p} />
        </div>
      </div>
    </article>
  );
}
