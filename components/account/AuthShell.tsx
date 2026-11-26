import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

/** Cadre des pages de connexion et d'inscription : une carte centrée, lisible dès 360 px. */
export function AuthShell({ title, lead, children, footer }: { title: string; lead?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="mx-auto max-w-md">
        <h1 className="text-[clamp(2.25rem,9vw,3.5rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
          {title}
          <span className="text-gold">.</span>
        </h1>
        {lead && <p className="mt-3 text-muted">{lead}</p>}
        <div className="mt-8 rounded-card bg-surface p-5 shadow-soft sm:p-7">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </Container>
  );
}

/** Message d'un retour de lien en erreur (?erreur=…), en français. */
export const linkErrors: Record<string, string> = {
  lien: "Ce lien n'est plus valable (déjà utilisé ou expiré). Demandez-en un nouveau ci-dessous.",
  google: "La connexion avec Google n'a pas abouti. Réessayez, ou utilisez votre e-mail.",
  annule: "Connexion avec Google annulée.",
  indisponible: "Les comptes ne sont pas disponibles pour le moment.",
};
