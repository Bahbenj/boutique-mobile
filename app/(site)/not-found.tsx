import type { Metadata } from "next";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { Button } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Page introuvable" };

/** 404 du site (produit retiré, lien erroné) : garde la barre de navigation et le panier. */
export default function SiteNotFound() {
  return (
    <ErrorScreen
      code="404"
      title="Page introuvable"
      actions={
        <>
          <Button href="/boutique" size="lg" icon={<IconArrowRight size={18} />}>
            Voir la boutique
          </Button>
          <Button href="/" size="lg" variant="light">
            Accueil
          </Button>
        </>
      }
    >
      <p>Ce produit n&apos;est plus en vente ou le lien est incomplet. Nos smartphones et accessoires disponibles sont dans la boutique.</p>
    </ErrorScreen>
  );
}
