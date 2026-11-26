import Link from "next/link";
import type { OrderStatus } from "@/lib/admin/orders-shared";
import { customerStatus, type MyOrder } from "@/lib/customer-orders";
import { cn, formatPrice } from "@/lib/utils";

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Bamako" });
const dayTime = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" });
export const formatDay = (iso: string) => day.format(new Date(iso));
export const formatDayTime = (iso: string) => dayTime.format(new Date(iso));

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "livree" && "bg-success/15 text-success",
        status === "annulee" && "bg-canvas text-muted ring-1 ring-fg/15",
        (status === "nouvelle" || status === "confirmee" || status === "expediee") && "bg-accent-soft text-fg ring-1 ring-accent/40",
      )}
    >
      {customerStatus[status].label}
    </span>
  );
}

/** Ligne de la liste « Mes commandes ». */
export function OrderCard({ order: o }: { order: MyOrder }) {
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  return (
    <li>
      <Link href={`/compte/commandes/${o.id}`} className="flex items-center gap-3 rounded-2xl bg-raised/50 p-3 ring-1 ring-line transition-colors hover:ring-fg/30">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold">{o.number}</span>
            <StatusPill status={o.status} />
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {formatDay(o.created_at)} · {count} article{count > 1 ? "s" : ""} · {o.items[0]?.name}
            {o.items.length > 1 ? "…" : ""}
          </p>
        </div>
        <span className="shrink-0 font-bold whitespace-nowrap tabular-nums">{formatPrice(o.total)}</span>
      </Link>
    </li>
  );
}

/** Suivi : étapes de la commande, avec la date de chaque étape atteinte. */
export function OrderTimeline({ status, history }: { status: OrderStatus; history: { to_status: OrderStatus; created_at: string }[] }) {
  const when = new Map(history.map((h) => [h.to_status, h.created_at]));
  if (status === "annulee") {
    return <p className="rounded-2xl bg-raised p-3 text-sm">Commande annulée{when.get("annulee") ? ` le ${formatDayTime(when.get("annulee")!)}` : ""}.</p>;
  }
  const steps: OrderStatus[] = ["nouvelle", "confirmee", "expediee", "livree"];
  const current = steps.indexOf(status);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", done ? "bg-accent text-on-accent" : "bg-raised text-muted ring-1 ring-line")}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className={cn("font-semibold", !done && "text-muted")}>
                {customerStatus[s].label}
                {i === current && <span className="sr-only"> (étape actuelle)</span>}
              </p>
              <p className="text-sm text-muted">{when.get(s) ? formatDayTime(when.get(s)!) : i === current ? customerStatus[s].help : i > current ? "À venir" : ""}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
