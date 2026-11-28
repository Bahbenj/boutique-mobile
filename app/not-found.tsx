import type { Metadata } from "next";
import { Logo } from "@/components/layout/Logo";
import { ErrorScreen } from "@/components/layout/ErrorScreen";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page introuvable" };

/**
 * 404 des adresses qui ne correspondent à aucune page (hors du site public et de
 * l'admin). Rendue dans le gabarit racine seul : logo et liens, sans le reste du site.
 */
export default function NotFound() {
  return (
    <main className="flex-1">
      <div className="absolute inset-x-0 top-6 flex justify-center">
        <Logo />
      </div>
      <ErrorScreen
        code="404"
        title="Page introuvable"
        actions={
          <>
            <Button href="/boutique" size="lg">
              Voir la boutique
            </Button>
            <Button href="/" size="lg" variant="light">
              Accueil
            </Button>
          </>
        }
      >
        <p>Cette adresse n&apos;existe pas ou plus. Vérifiez le lien, ou repartez de l&apos;accueil.</p>
      </ErrorScreen>
    </main>
  );
}
