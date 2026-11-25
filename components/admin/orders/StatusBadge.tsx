import { statusLabels, type OrderStatus } from "@/lib/admin/orders-shared";
import { cn } from "@/lib/utils";

/**
 * Statut d'une commande : étape d'un circuit (pas un « bon / mauvais »),
 * donc des tons neutres, toujours accompagnés du libellé.
 */
const tones: Record<OrderStatus, { box: string; dot: string }> = {
  nouvelle: { box: "bg-accent-soft text-fg", dot: "bg-accent" },
  confirmee: { box: "bg-surface text-fg ring-1 ring-line", dot: "bg-fg" },
  expediee: { box: "bg-fg text-canvas", dot: "bg-canvas" },
  livree: { box: "bg-success-soft text-fg", dot: "bg-success" },
  annulee: { box: "bg-raised text-muted", dot: "bg-muted/50" },
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const t = tones[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", t.box, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", t.dot)} />
      {statusLabels[status]}
    </span>
  );
}
