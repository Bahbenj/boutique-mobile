"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { useWhatsappLink } from "@/components/layout/StoreInfoProvider";
import { Button } from "@/components/ui/Button";
import { IconRefresh, IconWhatsApp } from "@/components/ui/icons";

/**
 * Erreur 500 du site (base injoignable, panne passagère) : on propose de réessayer,
 * ou de passer par WhatsApp pour ne pas perdre la vente. Le détail technique reste
 * dans les journaux du serveur (identifiant `digest`), jamais affiché au client.
 */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  const waLink = useWhatsappLink();
  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  useEffect(() => {
    console.error("[site] erreur d'affichage", digest || error);
  }, [error, digest]);

  return (
    <ErrorScreen
      code="Oups"
      title="Un problème passager est survenu"
      actions={
        <>
          <Button size="lg" onClick={() => retry()} icon={<IconRefresh size={18} />}>
            Réessayer
          </Button>
          <Button href={waLink("Bonjour, le site affiche une erreur. Je voudrais commander :")} size="lg" variant="whatsapp">
            <IconWhatsApp size={20} />
            Commander sur WhatsApp
          </Button>
        </>
      }
    >
      <p>La page n&apos;a pas pu s&apos;afficher. Réessayez dans un instant ; votre panier est conservé.</p>
      {digest && <p className="mt-3 text-xs">Référence : {digest}</p>}
    </ErrorScreen>
  );
}
