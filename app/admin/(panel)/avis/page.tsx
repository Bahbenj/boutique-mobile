import type { Metadata } from "next";
import Link from "next/link";
import { listProductReviews } from "@/lib/admin/product-reviews";
import { listReviews } from "@/lib/admin/settings";
import { cn } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductReviewModeration } from "@/components/admin/reviews/ProductReviewModeration";
import { ReviewManager } from "@/components/admin/reviews/ReviewManager";

export const metadata: Metadata = { title: "Avis clients" };

/**
 * Avis : onglet « Avis produits » (laissés par les clients connectés, à valider
 * avant publication) et onglet « Témoignages » (saisis par la boutique, écran
 * existant inchangé).
 */
export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/avis">) {
  const view = (await searchParams).vue === "temoignages" ? "temoignages" : "produits";
  return (
    <AdminPage title="Avis clients">
      <nav aria-label="Type d'avis" className="mb-5 flex gap-1 rounded-full bg-surface p-1 shadow-soft sm:inline-flex">
        {(
          [
            ["produits", "Avis produits"],
            ["temoignages", "Témoignages"],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={`/admin/avis?vue=${v}`}
            aria-current={view === v ? "page" : undefined}
            className={cn("flex h-11 flex-1 items-center justify-center rounded-full px-5 text-sm font-semibold whitespace-nowrap", view === v ? "bg-fg text-canvas" : "text-muted hover:text-fg")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {view === "produits" ? <ProductReviewsTab /> : <TestimonialsTab />}
    </AdminPage>
  );
}

async function ProductReviewsTab() {
  const { ready, reviews } = await listProductReviews();
  if (!ready)
    return <p className="rounded-card bg-surface p-6 text-center text-sm text-muted shadow-soft">Les avis produits apparaîtront après la mise à jour de la base (fichier all-in-one.sql).</p>;
  return <ProductReviewModeration reviews={reviews} />;
}

async function TestimonialsTab() {
  const res = await listReviews();
  if (!res.ok) {
    return (
      <p role="alert" className="rounded-card bg-danger-soft p-5 text-danger">
        Avis illisibles : {res.error}. La migration 9 (supabase/all-in-one.sql) a-t-elle été exécutée ?
      </p>
    );
  }
  const published = res.reviews.filter((r) => r.is_published).length;
  return (
    <>
      <p className="mb-4 text-muted">
        {res.reviews.length} témoignage{res.reviews.length > 1 ? "s" : ""}, dont {published} publié{published > 1 ? "s" : ""} sur l&apos;accueil.
      </p>
      <ReviewManager reviews={res.reviews} />
    </>
  );
}
