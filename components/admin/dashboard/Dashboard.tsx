import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import type { DashboardData } from "@/lib/admin/orders";
import { formatOrderDate } from "@/lib/admin/orders-shared";
import { cn, formatPrice } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { StatusBadge } from "@/components/admin/orders/StatusBadge";
import { RepairStatusBadge } from "@/components/admin/repairs/RepairStatusBadge";
import { IconArrowRight, IconImage, IconReceipt, IconWrench } from "@/components/ui/icons";

/**
 * Tableau de bord (composant d'affichage ; la page lit les données) :
 *   1. ce qui attend une action : commandes et réparations à traiter ;
 *   2. activité par période (heure de Bamako) : chiffre d'affaires, commandes,
 *      demandes de réparation reçues ;
 *   3. dernières commandes et dernières demandes ;
 *   4. stock faible.
 */
export function Dashboard({ email, data }: { email: string; data: DashboardData }) {
  const { stats, latest, latestRepairs, lowStock } = data;
  const ordersToProcess = stats.pending.nouvelle + stats.pending.confirmee;
  const repairsToProcess = stats.repairs.pending.nouvelle;

  const periodsList = [
    { label: "Aujourd'hui", ...stats.today, repairs: stats.repairs.received.today, href: "/admin/commandes?periode=jour" },
    { label: "Cette semaine", ...stats.week, repairs: stats.repairs.received.week, href: "/admin/commandes?periode=semaine" },
    { label: "Ce mois-ci", ...stats.month, repairs: stats.repairs.received.month, href: "/admin/commandes?periode=mois" },
  ];

  return (
    <AdminPage
      title="Tableau de bord"
      description={
        <>
          Connecté en tant que {email} ·{" "}
          <Link href="/admin/aide" className="font-semibold whitespace-nowrap text-accent hover:underline">
            Guide rapide
          </Link>
        </>
      }
    >
      {data.pendingReviews > 0 && (
        <Link
          href="/admin/avis?vue=produits"
          className="mb-3 flex min-h-12 items-center justify-between gap-3 rounded-card bg-accent-soft px-4 py-3 text-sm font-semibold ring-1 ring-accent/40 hover:ring-accent"
        >
          <span>
            {data.pendingReviews} avis client{data.pendingReviews > 1 ? "s" : ""} à valider avant publication
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
      {/* 1. À traiter */}
      <h2 className="sr-only">À traiter</h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <TodoCard
          title="Commandes à traiter"
          count={ordersToProcess}
          Icon={IconReceipt}
          tone="accent"
          href={stats.pending.nouvelle ? "/admin/commandes?statut=nouvelle" : "/admin/commandes"}
          cta={stats.pending.nouvelle ? "Traiter les nouvelles" : "Voir les commandes"}
          details={[
            { n: stats.pending.nouvelle, label: "à confirmer", href: "/admin/commandes?statut=nouvelle" },
            { n: stats.pending.confirmee, label: "à expédier", href: "/admin/commandes?statut=confirmee" },
            { n: stats.pending.expediee, label: "en livraison", href: "/admin/commandes?statut=expediee" },
          ]}
        />
        <TodoCard
          title="Réparations à traiter"
          count={repairsToProcess}
          Icon={IconWrench}
          tone="gold"
          href={repairsToProcess ? "/admin/reparations?statut=nouvelle" : "/admin/reparations"}
          cta={repairsToProcess ? "Envoyer les devis" : "Voir les réparations"}
          details={[
            { n: stats.repairs.pending.devis_envoye, label: "devis envoyé", href: "/admin/reparations?statut=devis_envoye" },
            { n: stats.repairs.pending.en_cours, label: "en cours", href: "/admin/reparations?statut=en_cours" },
            { n: stats.repairs.pending.prete, label: "prêtes", href: "/admin/reparations?statut=prete" },
          ]}
        />
      </div>

      {/* 2. Activité par période : chiffre d'affaires hors commandes annulées */}
      <section aria-labelledby="activity-title" className="mt-5">
        <h2 id="activity-title" className="sr-only">
          Activité
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {periodsList.map((p) => (
            <li key={p.label}>
              <Link href={p.href} className="block h-full rounded-card bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift">
                <p className="text-sm font-semibold text-muted">{p.label}</p>
                <p className="mt-2 text-[clamp(1.5rem,6vw,1.875rem)] font-bold tracking-tight tabular-nums">{formatPrice(p.revenue)}</p>
                <p className="mt-1 text-sm text-muted">
                  {p.orders} commande{p.orders > 1 ? "s" : ""} · {p.repairs} demande{p.repairs > 1 ? "s" : ""} de réparation
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

      {/* 3. Dernières commandes et demandes */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <Panel id="latest-title" title="Dernières commandes" href="/admin/commandes">
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
                    <span className="shrink-0 text-end">
                      <span className="block font-bold tabular-nums">{formatPrice(o.total)}</span>
                      <StatusBadge status={o.status} className="mt-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Aucune commande pour l&apos;instant.</p>
          )}
        </Panel>

        <Panel id="latest-repairs-title" title="Dernières demandes de réparation" href="/admin/reparations">
          {latestRepairs.length ? (
            <ul className="mt-3 divide-y divide-line">
              {latestRepairs.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reparations/${r.id}`} className="flex items-center gap-3 py-3 hover:bg-canvas/50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {r.number} · {r.device}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {r.customer_name} · {formatOrderDate(r.created_at)}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      {r.quote_amount != null && <span className="block font-bold tabular-nums">{formatPrice(r.quote_amount)}</span>}
                      <RepairStatusBadge status={r.status} className="mt-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Aucune demande pour l&apos;instant. Elles arrivent ici depuis le formulaire de la page Réparation.</p>
          )}
        </Panel>
      </div>

      {/* 4. Stock à surveiller */}
      <div className="mt-5">
        <Panel
          id="stock-title"
          title="Stock faible"
          href={lowStock.count > 0 ? "/admin/stock" : undefined}
          linkLabel={lowStock.count > lowStock.items.length ? `Les ${lowStock.count}` : "Gérer"}
        >
          {lowStock.items.length ? (
            <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-6 divide-y divide-line sm:grid-cols-[repeat(2,minmax(0,1fr))] sm:divide-y-0">
              {lowStock.items.map((p) => (
                <li key={p.id} className="sm:border-b sm:border-line">
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
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                        <span aria-hidden="true">⦸</span> Rupture
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-bold text-fg">
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
        </Panel>
      </div>
    </AdminPage>
  );
}

function TodoCard({
  title,
  count,
  Icon,
  tone,
  href,
  cta,
  details,
}: {
  title: string;
  count: number;
  Icon: ComponentType<{ size?: number }>;
  tone: "accent" | "gold";
  href: string;
  cta: string;
  details: { n: number; label: string; href: string }[];
}) {
  const accent = tone === "accent";
  return (
    <section className={cn("rounded-card-lg bg-surface p-5 ring-1 sm:p-6", accent ? "ring-accent/30" : "ring-gold/35", count > 0 && (accent ? "bg-accent-soft" : "bg-gold-soft"))}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", accent ? "bg-accent text-on-accent" : "bg-gold text-on-gold")}>
            <Icon size={20} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-muted">{title}</h3>
            <p className="text-5xl leading-none font-extrabold tracking-tight tabular-nums">{count}</p>
          </div>
        </div>
        <Link
          href={href}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold",
            accent ? "bg-accent text-on-accent hover:bg-accent-hover" : "bg-gold text-on-gold hover:bg-gold-hover",
          )}
        >
          {cta}
          <IconArrowRight size={16} />
        </Link>
      </div>
      <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-fg/12 pt-4 text-sm">
        {details.map((d) => (
          <li key={d.label}>
            <Link href={d.href} className="block rounded-xl py-1 hover:text-accent">
              <span className="block text-2xl font-bold tabular-nums">{d.n}</span>
              <span className="text-muted">{d.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Panel({ id, title, href, linkLabel = "Tout voir", children }: { id: string; title: string; href?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="h-full rounded-card bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-extrabold">
          {title}
        </h2>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-muted hover:text-fg">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
