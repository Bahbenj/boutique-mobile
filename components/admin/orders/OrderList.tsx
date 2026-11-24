import Link from "next/link";
import { formatOrderDate, formatPhone, itemCount, type DbOrder } from "@/lib/admin/orders-shared";
import { formatPrice } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

/** Liste de commandes : cartes sur mobile, tableau sur desktop. Chaque ligne ouvre la fiche. */
export function OrderList({ orders }: { orders: DbOrder[] }) {
  return (
    <div className="lg:overflow-hidden lg:rounded-card lg:bg-white lg:shadow-soft">
      <div
        aria-hidden="true"
        className="hidden grid-cols-[7rem_minmax(0,1fr)_9rem_8rem_8rem] gap-4 border-b border-line px-5 py-3 text-xs font-semibold text-muted lg:grid"
      >
        <span>Commande</span>
        <span>Client</span>
        <span>Date</span>
        <span className="text-end">Total</span>
        <span>Statut</span>
      </div>
      <ul className="space-y-2.5 lg:space-y-0 lg:divide-y lg:divide-line">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/commandes/${o.id}`}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-card bg-white p-4 shadow-soft transition-colors hover:bg-cream/60 lg:grid-cols-[7rem_minmax(0,1fr)_9rem_8rem_8rem] lg:items-center lg:gap-4 lg:rounded-none lg:px-5 lg:py-3.5 lg:shadow-none"
            >
              <span className="font-bold tabular-nums">{o.number}</span>
              <span className="row-span-1 justify-self-end lg:order-last lg:justify-self-start">
                <StatusBadge status={o.status} />
              </span>
              <span className="col-span-2 min-w-0 lg:col-span-1">
                <span className="block truncate font-semibold">{o.customer_name}</span>
                <span className="block truncate text-sm text-muted">
                  {formatPhone(o.phone)} · {o.governorate}
                </span>
              </span>
              <span className="text-sm text-muted">{formatOrderDate(o.created_at)}</span>
              <span className="text-end font-bold tabular-nums lg:text-end">
                {formatPrice(o.total)}
                <span className="block text-xs font-medium text-muted">
                  {itemCount(o)} article{itemCount(o) > 1 ? "s" : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
