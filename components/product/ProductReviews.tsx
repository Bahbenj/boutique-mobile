import Link from "next/link";
import type { Product } from "@/data/products";
import { getPublishedReviews } from "@/lib/product-reviews";
import { buttonClasses } from "@/components/ui/Button";
import { ReviewList } from "./ReviewList";
import { Stars } from "./Stars";

/**
 * Avis clients de la fiche produit : moyenne, nombre, % de recommandation,
 * répartition des notes, liste, et bouton « Donner mon avis » (compte requis :
 * la page d'avis est derrière la connexion, avec retour automatique).
 */
export async function ProductReviews({ product }: { product: Product }) {
  const reviews = await getPublishedReviews(product.id);
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const recommend = count ? Math.round((100 * reviews.filter((r) => r.recommends).length) / count) : 0;
  const avg = average.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const href = `/compte/avis?produit=${encodeURIComponent(product.slug)}`;

  return (
    <section aria-labelledby="avis-title" className="mt-16 scroll-mt-28" id="avis">
      <h2 id="avis-title" className="text-2xl font-extrabold sm:text-3xl">
        Avis clients
      </h2>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="rounded-card bg-surface p-5 shadow-soft lg:sticky lg:top-28 lg:self-start">
          {count ? (
            <>
              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight tabular-nums">{avg}</span>
                <span className="text-muted">/ 5</span>
              </p>
              <Stars value={average} size={20} className="mt-1" />
              <p className="mt-1 text-sm text-muted">
                {count} avis · <strong className="text-fg">{recommend} %</strong> recommandent ce produit
              </p>
              <ul className="mt-4 space-y-1.5" aria-label="Répartition des notes">
                {[5, 4, 3, 2, 1].map((n) => {
                  const k = reviews.filter((r) => r.rating === n).length;
                  return (
                    <li key={n} className="flex items-center gap-2 text-sm">
                      <span className="w-8 shrink-0 tabular-nums">{n} ★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                        <span className="block h-full rounded-full bg-gold" style={{ width: `${(100 * k) / count}%` }} />
                      </span>
                      <span className="w-6 shrink-0 text-end text-muted tabular-nums">{k}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-muted">Pas encore d&apos;avis sur ce produit. Vous l&apos;avez acheté ? Soyez le premier à le noter.</p>
          )}
          <Link href={href} className={buttonClasses("primary", "md", "mt-5 w-full")}>
            Donner mon avis
          </Link>
          <p className="mt-2 text-center text-xs text-muted">Avis publiés après relecture par la boutique.</p>
        </div>
        {count > 0 && <ReviewList reviews={reviews} />}
      </div>
    </section>
  );
}
