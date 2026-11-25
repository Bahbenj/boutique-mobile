import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "subtle" | "inverse" | "accent" | "gold" | "glass";

const tones: Record<Tone, string> = {
  neutral: "bg-raised text-fg ring-1 ring-fg/12",
  subtle: "bg-canvas text-muted ring-1 ring-fg/10",
  inverse: "bg-fg text-canvas",
  accent: "bg-accent text-on-accent",
  /** Rose doré : détails, nouveautés, mises en avant. */
  gold: "bg-gold text-on-gold",
  glass: "bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-md",
};

/** Petit badge pilule. `index` affiche un numéro : « 01 · Neufs ». */
export function Badge({
  children,
  index,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  index?: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-5 whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {index !== undefined && (
        <>
          <span className="tabular-nums opacity-60">{String(index).padStart(2, "0")}</span>
          <span aria-hidden="true" className="opacity-40">·</span>
        </>
      )}
      {children}
    </span>
  );
}
