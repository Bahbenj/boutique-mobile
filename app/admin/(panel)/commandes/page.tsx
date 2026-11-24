import type { Metadata } from "next";
import Link from "next/link";
import { countByStatus, listOrders, ORDERS_PER_PAGE } from "@/lib/admin/orders";
import { orderStatuses, periods, type OrderStatus, type Period } from "@/lib/admin/orders-shared";
import { AdminPage } from "@/components/admin/AdminPage";
import { OrderFilters } from "@/components/admin/orders/OrderFilters";
import { OrderList } from "@/components/admin/orders/OrderList";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Commandes" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/commandes">) {
  const sp = await searchParams;
  const statut = orderStatuses.includes(sp.statut as OrderStatus) ? (sp.statut as OrderStatus) : undefined;
  const periode = typeof sp.periode === "string" && sp.periode in periods ? (sp.periode as Period) : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const pageNum = Math.max(1, Number(sp.page) || 1);

  const [{ orders, count, page }, counts] = await Promise.all([listOrders({ statut, periode, q, page: pageNum }), countByStatus()]);
  const pages = Math.max(1, Math.ceil(count / ORDERS_PER_PAGE));
  const filtered = Boolean(statut || periode || q);
  const pageHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    next.set("page", String(p));
    return `/admin/commandes?${next}`;
  };

  return (
    <AdminPage title="Commandes" description={`${count} commande${count > 1 ? "s" : ""}${filtered ? " (filtrées)" : ""}`}>
      <OrderFilters counts={counts} />
      <div className="mt-5">
        {orders.length ? (
          <OrderList orders={orders} />
        ) : (
          <p className="rounded-card bg-white p-8 text-center font-semibold shadow-soft">
            {filtered ? "Aucune commande ne correspond à ces filtres." : "Aucune commande pour l'instant."}
          </p>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-5 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className={buttonClasses("light", "sm", "shadow-soft")}>
              ← Précédentes
            </Link>
          )}
          <span className="px-2 text-sm text-muted tabular-nums">
            Page {page} / {pages}
          </span>
          {page < pages && (
            <Link href={pageHref(page + 1)} className={buttonClasses("light", "sm", "shadow-soft")}>
              Suivantes →
            </Link>
          )}
        </nav>
      )}
    </AdminPage>
  );
}
