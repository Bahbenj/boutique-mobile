import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { HexDivider } from "@/components/ui/Hex";

/**
 * Gabarit des pages de texte (CGV, retours et garantie) : titre, bandeau
 * « texte type à faire valider », sections numérotées, lisibles sur mobile.
 */
export function LegalPage({ title, lead, updated, children }: { title: string; lead: string; updated: string; children: ReactNode }) {
  return (
    <Container className="max-w-3xl pt-28 pb-20 sm:pt-36 sm:pb-28">
      <h1 className="text-[clamp(2.25rem,8vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
        {title}
        <span className="text-gold">.</span>
      </h1>
      <p className="mt-4 text-muted sm:text-lg">{lead}</p>
      <p className="mt-2 text-sm text-muted">Dernière mise à jour : {updated}</p>
      {/* TODO client : faire relire et valider ce texte, puis retirer ce bandeau */}
      <p role="note" className="mt-6 rounded-2xl bg-gold-soft p-4 text-sm ring-1 ring-gold/30">
        Texte type en cours de validation par <strong>Mobile Empire</strong>. En cas de doute, contactez-nous avant de commander.
      </p>
      <HexDivider className="my-10" />
      <div className="space-y-10 leading-relaxed text-fg/85 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-fg [&_li]:ms-5 [&_li]:list-disc [&_li]:ps-1 [&_p+p]:mt-3 [&_section>*+*]:mt-3 [&_strong]:text-fg [&_ul]:space-y-1.5">
        {children}
      </div>
    </Container>
  );
}
