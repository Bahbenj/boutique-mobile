import { Container } from "@/components/ui/Container";

/** Squelette de la fiche produit : même grille que la page réelle. */
export default function ProductLoading() {
  return (
    <Container className="pt-24 pb-20 sm:pt-32 sm:pb-28" aria-busy="true">
      <span className="sr-only" role="status">
        Chargement du produit…
      </span>
      <div className="skeleton mb-6 h-4 w-48 rounded-full" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14 [&>*]:min-w-0">
        <div>
          <div className="skeleton aspect-square rounded-card-lg sm:aspect-[5/4] lg:aspect-square" />
          <div className="mt-3 flex gap-2">
            <div className="skeleton size-16 rounded-2xl sm:size-20" />
            <div className="skeleton size-16 rounded-2xl sm:size-20" />
          </div>
        </div>
        <div>
          <div className="skeleton h-4 w-20 rounded-full" />
          <div className="skeleton mt-3 h-12 w-3/4 rounded-2xl sm:h-14" />
          <div className="skeleton mt-5 h-4 w-full rounded-full" />
          <div className="skeleton mt-2 h-4 w-5/6 rounded-full" />
          <div className="mt-6 flex gap-1.5">
            <div className="skeleton h-7 w-20 rounded-full" />
            <div className="skeleton h-7 w-24 rounded-full" />
          </div>
          <div className="skeleton mt-4 h-9 w-40 rounded-full" />
          <div className="mt-7 flex gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton size-10 rounded-full" />
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12 w-24 rounded-full" />
            ))}
          </div>
          <div className="skeleton mt-8 h-14 rounded-full" />
          <div className="skeleton mt-8 h-36 rounded-card" />
        </div>
      </div>
    </Container>
  );
}
