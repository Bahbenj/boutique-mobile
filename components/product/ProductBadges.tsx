import type { Product } from "@/data/products";
import { t } from "@/i18n";
import { discountPercent, stockState } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

type Props = {
  product: Product;
  /** Prix de la capacité choisie (fiche produit). */
  price?: number;
  oldPrice?: number;
  /** Carte : libellés courts (« −23 % », sans l'état) et sans « Stock limité » (affiché à part). */
  compact?: boolean;
  className?: string;
};

type BadgeItem = { key: string; label: string; tone: "inverse" | "neutral" | "accent" | "gold" };

/** Liste ordonnée des badges d'un produit (aussi lue par les lecteurs d'écran sur les cartes). */
export function productBadges({ product: p, price = p.price, oldPrice = p.oldPrice, compact = false }: Omit<Props, "className">) {
  const stock = stockState(p.stock);
  const off = discountPercent(price, oldPrice);
  const used = p.condition !== "neuf";
  const usedLabel = p.condition === "reconditionne" ? t.product.refurbished : t.product.used;
  const items: BadgeItem[] = [];
  if (stock === "out") items.push({ key: "out", label: t.product.outOfStock, tone: "inverse" });
  if (p.isNew && !used && stock !== "out") items.push({ key: "new", label: t.product.new, tone: "gold" });
  if (used) items.push({ key: "used", label: compact || !p.grade ? usedLabel : `${usedLabel} · ${p.grade}`, tone: "neutral" });
  if (off && stock !== "out") items.push({ key: "promo", label: compact ? `−${off} %` : t.product.promo(off), tone: "gold" });
  else if (p.tag && stock !== "out") items.push({ key: "tag", label: p.tag, tone: "gold" });
  if (p.freeDelivery && stock !== "out") items.push({ key: "free", label: t.product.freeDelivery, tone: "accent" });
  if (!compact && stock === "low") items.push({ key: "low", label: t.product.lowStock, tone: "neutral" });
  return items;
}

/**
 * Badges calculés depuis les données produit :
 * Rupture (stock 0) · Nouveau (isNew) · Occasion / Reconditionné (condition)
 * · Promo −X % (oldPrice > price) · Stock limité (stock ≤ LOW_STOCK).
 */
export function ProductBadges({ className, ...props }: Props) {
  const items = productBadges(props);
  if (!items.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((b) => (
        <Badge key={b.key} tone={b.tone}>
          {b.label}
        </Badge>
      ))}
    </div>
  );
}

/** « Stock limité » posé en bas du visuel des cartes. */
export function LowStockBadge({ stock, className }: { stock: number; className?: string }) {
  if (stockState(stock) !== "low") return null;
  return (
    <Badge tone="neutral" className={cn("gap-1.5", className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
      {t.product.lowStock}
    </Badge>
  );
}
