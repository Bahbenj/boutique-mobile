import { Suspense } from "react";

/** Pages à imprimer (bon de livraison) : sans navigation d'admin. */
export default function PrintLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main id="contenu" className="flex-1 bg-cream print:bg-white">
      <Suspense fallback={<div className="skeleton mx-auto mt-8 h-[29.7cm] max-w-[21cm] rounded-card" aria-hidden="true" />}>{children}</Suspense>
    </main>
  );
}
