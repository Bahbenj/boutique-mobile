import type { ReactNode } from "react";
import { HexPattern } from "@/components/ui/Hex";

/**
 * Écran d'erreur commun (404, 500) : code, titre, explication, actions.
 * Sans état ni donnée : utilisable dans not-found (serveur) comme dans error (client).
 */
export function ErrorScreen({ code, title, children, actions }: { code: string; title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-[70svh] items-center overflow-hidden px-4 pt-28 pb-20 sm:pt-36">
      <HexPattern className="-z-10 text-accent/10" />
      <div className="mx-auto w-full max-w-xl text-center">
        <p className="text-display text-[clamp(4.5rem,24vw,8rem)] leading-none text-gold-text" aria-hidden="true">
          {code}
        </p>
        <h1 className="mt-4 text-[clamp(1.75rem,7vw,2.5rem)] leading-tight font-extrabold tracking-tight">{title}</h1>
        <div className="mx-auto mt-3 max-w-md text-muted sm:text-lg">{children}</div>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">{actions}</div>
      </div>
    </section>
  );
}
