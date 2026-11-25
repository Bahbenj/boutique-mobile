import { repairStatusLabels, type RepairStatus } from "@/lib/admin/repairs-shared";
import { cn } from "@/lib/utils";

/** Statut d'une demande de réparation : tons neutres, toujours avec le libellé. */
const tones: Record<RepairStatus, { box: string; dot: string }> = {
  nouvelle: { box: "bg-accent-soft text-fg", dot: "bg-accent" },
  devis_envoye: { box: "bg-surface text-fg ring-1 ring-line", dot: "bg-gold" },
  en_cours: { box: "bg-gold-soft text-fg", dot: "bg-gold" },
  prete: { box: "bg-success-soft text-fg", dot: "bg-success" },
  recuperee: { box: "bg-raised text-fg", dot: "bg-success" },
  annulee: { box: "bg-raised text-muted", dot: "bg-muted/50" },
};

export function RepairStatusBadge({ status, className }: { status: RepairStatus; className?: string }) {
  const t = tones[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", t.box, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", t.dot)} />
      {repairStatusLabels[status]}
    </span>
  );
}
