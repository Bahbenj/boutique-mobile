import { Container } from "@/components/ui/Container";
import { ProductGridSkeleton } from "@/components/product/ProductGrid";

/** Squelette de la boutique (et de ses rayons) pendant le chargement. */
export default function ShopLoading() {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28" aria-busy="true">
      <span className="sr-only" role="status">
        Chargement des produits…
      </span>
      <div className="skeleton h-[clamp(2.5rem,9vw,5rem)] w-2/3 max-w-xl rounded-3xl" />
      <div className="skeleton mt-5 h-5 w-full max-w-md rounded-full" />
      <div className="mt-8 flex gap-2 overflow-hidden">
        {[88, 104, 112, 128].map((w) => (
          <div key={w} className="skeleton h-11 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="skeleton mt-8 mb-5 h-4 w-24 rounded-full" />
      <ProductGridSkeleton />
    </Container>
  );
}
