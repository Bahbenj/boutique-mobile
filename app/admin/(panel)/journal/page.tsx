import type { Metadata } from "next";
import Link from "next/link";
import { listActivity } from "@/lib/admin/activity";
import { cn } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { ActivityList } from "@/components/admin/activity/ActivityList";

export const metadata: Metadata = { title: "Journal d'activité" };

/** Journal d'activité : qui a fait quoi dans l'admin (propriétaire seul). */
export default async function AdminJournalPage({ searchParams }: PageProps<"/admin/journal">) {
  const sp = await searchParams;
  const actor = typeof sp.qui === "string" ? sp.qui.slice(0, 320) : undefined;
  const { ready, entries, actors } = await listActivity(actor);

  return (
    <AdminPage title="Journal d'activité" description="Ce que chaque membre de l'équipe a fait dans l'administration. Vous seul le voyez.">
      {actors.length > 1 && (
        <nav aria-label="Filtrer par personne" className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {[undefined, ...actors].map((a) => (
              <li key={a ?? "tous"}>
                <Link
                  href={a ? `/admin/journal?qui=${encodeURIComponent(a)}` : "/admin/journal"}
                  aria-current={actor === a ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap ring-1",
                    actor === a ? "bg-accent-soft ring-accent" : "bg-surface ring-line hover:ring-fg/40",
                  )}
                >
                  {a ? a.split("@")[0] : "Tout le monde"}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {!ready ? (
        <p className="rounded-card bg-surface p-6 text-center text-sm text-muted shadow-soft">Le journal apparaîtra après la mise à jour de la base (fichier all-in-one.sql).</p>
      ) : entries.length === 0 ? (
        <div className="rounded-card bg-surface p-6 text-center shadow-soft">
          <p className="font-semibold">Rien pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-muted">Chaque changement de prix, de stock, de statut ou de réglage apparaîtra ici avec son auteur.</p>
        </div>
      ) : (
        <ActivityList entries={entries} />
      )}
    </AdminPage>
  );
}
