import Link from "next/link";
import { formatOrderDate, formatPhone } from "@/lib/admin/orders-shared";
import type { DbRepair } from "@/lib/admin/repairs-shared";
import { formatPrice } from "@/lib/utils";
import { RepairStatusBadge } from "./RepairStatusBadge";

/** Liste des demandes : cartes sur mobile, tableau sur desktop. Chaque ligne ouvre la fiche. */
export function RepairList({ repairs }: { repairs: DbRepair[] }) {
  return (
    <div className="lg:overflow-hidden lg:rounded-card lg:bg-surface lg:shadow-soft">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_9rem_8rem] gap-4 border-b border-line px-5 py-3 text-xs font-semibold text-muted lg:grid"
      >
        <span>Demande</span>
        <span>Client</span>
        <span>Modèle et panne</span>
        <span>Date</span>
        <span>Statut</span>
      </div>
      <ul className="space-y-2.5 lg:space-y-0 lg:divide-y lg:divide-line">
        {repairs.map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/reparations/${r.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-card bg-surface p-4 shadow-soft transition-colors hover:bg-canvas/60 lg:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_9rem_8rem] lg:items-center lg:gap-4 lg:rounded-none lg:px-5 lg:py-3.5 lg:shadow-none"
            >
              <span className="font-bold tabular-nums">{r.number}</span>
              <span className="justify-self-end lg:order-last lg:justify-self-start">
                <RepairStatusBadge status={r.status} />
              </span>
              <span className="col-span-2 min-w-0 lg:col-span-1">
                <span className="block truncate font-semibold">{r.customer_name}</span>
                <span className="block truncate text-sm text-muted">{formatPhone(r.phone)}</span>
              </span>
              <span className="col-span-2 min-w-0 lg:col-span-1">
                <span className="block truncate font-semibold">{r.device}</span>
                <span className="block truncate text-sm text-muted">{r.issue}</span>
              </span>
              <span className="text-sm text-muted">{formatOrderDate(r.created_at)}</span>
              {r.quote_amount != null && <span className="text-end text-sm font-bold tabular-nums lg:hidden">Devis {formatPrice(r.quote_amount)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
