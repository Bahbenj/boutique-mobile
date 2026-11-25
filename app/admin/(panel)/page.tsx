import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDashboard } from "@/lib/admin/orders";
import { formatOrderDate } from "@/lib/admin/orders-shared";
import { requireAdmin } from "@/lib/auth";
import { cn, formatPrice } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { StatusBadge } from "@/components/admin/orders/StatusBadge";
import { IconArrowRight, IconImage, IconWrench } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Tableau de bord" };

/**
 * Tableau de bord : d'abord ce qui attend une action (chiffre principal),
 * puis l'activité par période, le stock à surveiller et les dernières commandes.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const data = await getDashboard();

  if ("error" in data) {
    return (
      <AdminPage title="Tableau de bord">
        <p role="alert" className="rounded-card bg-danger-soft p-5 text-danger">
          Statistiques indisponibles : {data.error?.message}. La migration du tableau de bord (supabase/all-in-one.sql) a-t-elle été exécutée ?
        </p>
      </AdminPage>
    );
  }

  const { stats, latest, lowStock, pendingRepairs } = data;
  const toProcess = stats.pending.nouvelle + stats.pending.confirmee;
  const periodsList = [
    { label: "Aujourd'hui", ...stats.today, href: "/admin/commandes?periode=jour" },
    { label: "Cette semaine", ...stats.week, href: "/admin/commandes?periode=semaine" },
    { label: "Ce mois-ci", ...stats.month, href: "/admin/commandes?periode=mois" },
  ];

  return (
    <AdminPage title="Tableau de bord" description={`Connecté en tant que ${admin.email}`}>
      {/* Chiffre principal : ce qui attend une action */}
      <section aria-labelledby="todo-title" className="rounded-card-lg bg-surface p-5 ring-1 ring-accent/30 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="todo-title" className="text-sm font-semibold text-muted">
              Commandes à traiter
            </h2>
            <p className="mt-1 text-6xl leading-none font-extrabold tracking-tight">{toProcess}</p>
          </div>
          <Link
            href={toProcess ? "/admin/commandes?statut=nouvelle" : "/admin/commandes"}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent hover:bg-accent-hover"
          >
            {stats.pending.nouvelle ? "Traiter les nouvelles" : "Voir les commandes"}
            <IconArrowRight size={16} />
          </Link>
        </div>
        <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-fg/12 pt-4 text-sm">
          {[
            { n: stats.pending.nouvelle, label: "à confirmer", statut: "nouvelle" },
            { n: stats.pending.confirmee, label: "à expédier", statut: "confirmee" },
            { n: stats.pending.expediee, label: "en livraison", statut: "expediee" },
          ].map((s) => (
            <li key={s.statut}>
              <Link href={`/admin/commandes?statut=${s.statut}`} className="block rounded-xl py-1 hover:text-accent">
                <span className="block text-2xl font-bold">{s.n}</span>
                <span className="text-muted">{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Demandes de réparation non traitées */}
      {pendingRepairs !== null && (
        <Link
          href={pendingRepairs ? "/admin/reparations?statut=nouvelle" : "/admin/reparations"}
          className={cn(
            "mt-3 flex items-center gap-4 rounded-card p-4 transition-shadow hover:shadow-lift sm:p-5",
            pendingRepairs ? "bg-gold-soft ring-1 ring-gold/40" : "bg-surface shadow-soft",
          )}
        >
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", pendingRepairs ? "bg-gold text-on-gold" : "bg-raised text-muted")}>
            <IconWrench size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">
              {pendingRepairs
                ? `${pendingRepairs} demande${pendingRepairs > 1 ? "s" : ""} de réparation à traiter`
                : "Aucune demande de réparation en attente"}
            </span>
            <span className="block text-sm text-muted">{pendingRepairs ? "Envoyez le devis sur WhatsApp." : "Les nouvelles demandes du site arrivent ici."}</span>
          </span>
          <IconArrowRight size={18} className="shrink-0 text-muted" />
        </Link>
      )}

      {/* Activité par période : chiffre d'affaires hors commandes annulées */}
      <section aria-labelledby="activity-title" className="mt-5">
        <h2 id="activity-title" className="sr-only">
          Activité
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {periodsList.map((p) => (
            <li key={p.label}>
              <Link href={p.href} className="block h-full rounded-card bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                <p className="text-sm font-semibold text-muted">{p.label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">{formatPrice(p.revenue)}</p>
                <p className="mt-1 text-sm text-muted">
                  {p.orders} commande{p.orders > 1 ? "s" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Chiffre d&apos;affaires des commandes non annulées, livraison comprise. Ce mois-ci : {formatPrice(stats.month.collected)} encaissés
          (commandes livrées)
          {stats.month.cancelled ? `, ${stats.month.cancelled} annulée${stats.month.cancelled > 1 ? "s" : ""}` : ""}.
        </p>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Dernières commandes */}
        <section aria-labelledby="latest-title" className="rounded-card bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 id="latest-title" className="text-lg font-extrabold">
              Dernières commandes
            </h2>
            <Link href="/admin/commandes" className="text-sm font-semibold text-muted hover:text-fg">
              Tout voir
            </Link>
          </div>
          {latest.length ? (
            <ul className="mt-3 divide-y divide-line">
              {latest.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/commandes/${o.id}`} className="flex items-center gap-3 py-3 hover:bg-canvas/50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {o.number} · {o.customer_name}
                      </span>
                      <span className="block text-sm text-muted">{formatOrderDate(o.created_at)}</span>
                    </span>
                    <span className="text-end">
                      <span className="block font-bold">{formatPrice(o.total)}</span>
                      <StatusBadge status={o.status} className="mt-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Aucune commande pour l&apos;instant.</p>
          )}
        </section>

        {/* Stock à surveiller : seule vraie alerte de la page (icône + libellé) */}
        <section aria-labelledby="stock-title" className="rounded-card bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 id="stock-title" className="text-lg font-extrabold">
              Stock faible
            </h2>
            {lowStock.count > 0 && (
              <Link href="/admin/produits?statut=faible&tri=stock" className="text-sm font-semibold text-muted hover:text-fg">
                {lowStock.count > lowStock.items.length ? `Les ${lowStock.count}` : "Gérer"}
              </Link>
            )}
          </div>
          {lowStock.items.length ? (
            <ul className="mt-3 divide-y divide-line">
              {lowStock.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/produits/${p.id}`} className="flex items-center gap-3 py-2.5 hover:bg-canvas/50">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-raised">
                      {p.images[0] ? (
                        <Image src={p.images[0]} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-muted">
                          <IconImage size={16} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                    {p.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                        <span aria-hidden="true">⦸</span> Rupture
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-fg">
                        <span aria-hidden="true">!</span> {p.stock} restant{p.stock > 1 ? "s" : ""}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Aucun produit en ligne sous 3 unités.</p>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
