import { t } from "@/i18n";
import { cn, formatPrice } from "@/lib/utils";

/** Prix + ancien prix barré. `from` préfixe « dès » (plusieurs capacités). */
export function Price({
  price,
  oldPrice,
  from = false,
  size = "md",
  className,
}: {
  price: number;
  oldPrice?: number;
  from?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const promo = oldPrice && oldPrice > price;
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      {from && <span className="text-xs font-medium text-muted">{t.product.from}</span>}
      <span className={cn("font-bold tabular-nums", size === "lg" ? "text-3xl tracking-tight" : "text-base")}>
        {formatPrice(price)}
      </span>
      {promo && (
        <s className={cn("text-muted tabular-nums", size === "lg" ? "text-lg" : "text-sm")}>
          <span className="sr-only">au lieu de </span>
          {formatPrice(oldPrice)}
        </s>
      )}
    </p>
  );
}
