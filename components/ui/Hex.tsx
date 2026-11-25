import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Motif hexagonal de la marque (voir .hex, .hex-soft, .hex-pattern dans
 * app/globals.css). Le contour est obtenu par deux hexagones superposés :
 * clip-path coupe les bordures et les ombres classiques.
 */

const tones = {
  blue: { edge: "bg-accent/45", fill: "bg-accent-soft", icon: "text-accent" },
  gold: { edge: "bg-gold/55", fill: "bg-gold-soft", icon: "text-gold-text" },
  solid: { edge: "bg-gold", fill: "bg-gold", icon: "text-on-gold" },
} as const;

/** Icône dans un hexagone à liseré (services, coordonnées, engagements). */
export function HexIcon({
  children,
  tone = "blue",
  size = "md",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = tones[tone];
  const box = size === "sm" ? "h-7 w-[1.55rem]" : size === "lg" ? "h-16 w-14" : "h-12 w-[2.6rem]";
  return (
    <span aria-hidden="true" className={cn("hex relative grid shrink-0 place-items-center", box, t.edge, className)}>
      <span className={cn("hex absolute inset-[1.5px]", t.fill)} />
      <span className={cn("relative", t.icon)}>{children}</span>
    </span>
  );
}

/** Petite puce hexagonale pleine (listes, badges). */
export function HexDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("hex inline-block h-2 w-[0.45rem] shrink-0 bg-gold", className)} />;
}

/** Séparateur : filet, trois hexagones, filet. */
export function HexDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex items-center gap-2.5", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
      <span className="hex h-2.5 w-[0.55rem] bg-accent/60" />
      <span className="hex h-3.5 w-3 bg-gold" />
      <span className="hex h-2.5 w-[0.55rem] bg-accent/60" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
    </div>
  );
}

/** Nid d'abeille bleu en filigrane, à poser dans un parent `relative`. `className` remplace la couleur par défaut. */
export function HexPattern({ className = "text-accent/15" }: { className?: string }) {
  return <span aria-hidden="true" className={cn("hex-pattern pointer-events-none absolute inset-0", className)} />;
}
