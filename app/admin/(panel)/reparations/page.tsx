import type { Metadata } from "next";
import Link from "next/link";
import { countRepairsByStatus, listRepairs, REPAIRS_PER_PAGE } from "@/lib/admin/repairs";
import { repairStatuses, type RepairStatus } from "@/lib/admin/repairs-shared";
import { AdminPage } from "@/components/admin/AdminPage";
import { RepairFilters } from "@/components/admin/repairs/RepairFilters";
import { RepairList } from "@/components/admin/repairs/RepairList";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Réparations" };

export default async function AdminRepairsPage({ searchParams }: PageProps<"/admin/reparations">) {
  const sp = await searchParams;
  const statut = repairStatuses.includes(sp.statut as RepairStatus) ? (sp.statut as RepairStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const pageNum = Math.max(1, Number(sp.page) || 1);

  const [result, counts] = await Promise.all([listRepairs({ statut, q, page: pageNum }), countRepairsByStatus()]);
  if ("error" in result && result.error) {
    return (
      <AdminPage title="Réparations">
        <p role="alert" className="rounded-card bg-danger-soft p-5 text-danger">
          Demandes illisibles : {result.error}. La migration 13 (supabase/all-in-one.sql) a-t-elle été exécutée ?
        </p>
      </AdminPage>
    );
  }
  const { repairs, count, page } = result;
  const pages = Math.max(1, Math.ceil(count / REPAIRS_PER_PAGE));
  const filtered = Boolean(statut || q);
  const pageHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    next.set("page", String(p));
    return `/admin/reparations?${next}`;
  };

  return (
    <AdminPage title="Réparations" description={`${count} demande${count > 1 ? "s" : ""}${filtered ? " (filtrées)" : ""}`}>
      <RepairFilters counts={counts} />
      <div className="mt-5">
        {repairs.length ? (
          <RepairList repairs={repairs} />
        ) : (
          <p className="rounded-card bg-surface p-8 text-center font-semibold shadow-soft">
            {filtered ? "Aucune demande ne correspond à ces filtres." : "Aucune demande de réparation pour l'instant."}
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
