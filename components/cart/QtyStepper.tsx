import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { IconMinus, IconPlus } from "@/components/ui/icons";

/** Sélecteur de quantité − n +. */
export function QtyStepper({
  value,
  max,
  min = 1,
  onChange,
  size = "sm",
  label,
}: {
  value: number;
  max: number;
  min?: number;
  onChange: (n: number) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  const btn = cn(
    "grid place-items-center rounded-full transition-colors hover:bg-fg/5 disabled:opacity-30 disabled:hover:bg-transparent",
    size === "sm" ? "size-8" : "size-11",
  );
  return (
    <div
      role="group"
      aria-label={label ?? t.product.quantity}
      className={cn("inline-flex items-center rounded-full bg-surface ring-1 ring-line", size === "sm" ? "p-0.5" : "p-1")}
    >
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t.cart.decrease}>
        <IconMinus size={size === "sm" ? 14 : 16} />
      </button>
      <span className={cn("text-center font-semibold tabular-nums", size === "sm" ? "w-7 text-sm" : "w-9")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={value >= max ? t.cart.maxReached : t.cart.increase}
      >
        <IconPlus size={size === "sm" ? 14 : 16} />
      </button>
    </div>
  );
}
