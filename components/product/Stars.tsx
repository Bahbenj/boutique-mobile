import { cn } from "@/lib/utils";

const STAR = "M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.85 9.45l6.32-.92L12 2.8z";

/** Étoiles (0 à 5, demi-étoiles comprises), or du logo ; le texte lisible est fourni par `label`. */
export function Stars({ value, size = 16, className, label }: { value: number; size?: number; className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={label ?? `${String(value).replace(".", ",")} sur 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
            <path d={STAR} className="fill-fg/15" />
            {fill > 0 && (
              <path d={STAR} className="fill-gold" style={fill < 1 ? { clipPath: `inset(0 ${Math.round((1 - fill) * 100)}% 0 0)` } : undefined} />
            )}
          </svg>
        );
      })}
    </span>
  );
}

/** « ★★★★☆ 4,6 (12) » : résumé compact des cartes produit. */
export function RatingInline({ average, count, className }: { average: number; count: number; className?: string }) {
  const avg = average.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <Stars value={average} size={14} label={`Note ${avg} sur 5, ${count} avis`} />
      <span className="font-semibold tabular-nums" aria-hidden="true">
        {avg}
      </span>
      <span className="text-muted tabular-nums" aria-hidden="true">
        ({count})
      </span>
    </span>
  );
}
