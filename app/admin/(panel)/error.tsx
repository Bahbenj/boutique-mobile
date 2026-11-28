"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { IconRefresh } from "@/components/ui/icons";

/** Erreur dans une page de l'admin : le menu reste affiché, la page se recharge d'un geste. */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  useEffect(() => {
    console.error("[admin] erreur d'affichage", digest || error);
  }, [error, digest]);

  return (
    <div className="mx-auto max-w-lg rounded-card bg-surface p-6 text-center shadow-soft sm:p-8">
      <h1 className="text-2xl font-extrabold">Cette page n&apos;a pas pu s&apos;afficher</h1>
      <p className="mt-2 text-muted">
        Souvent une coupure de connexion. Réessayez ; si cela continue, notez la référence ci-dessous pour la personne qui gère le site.
      </p>
      {digest && <p className="mt-3 text-xs text-muted">Référence : {digest}</p>}
      <Button size="lg" className="mt-6 max-sm:w-full" onClick={() => retry()} icon={<IconRefresh size={18} />}>
        Réessayer
      </Button>
    </div>
  );
}
