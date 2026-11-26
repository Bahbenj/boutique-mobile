import type { Metadata } from "next";
import { getAdminSettings } from "@/lib/admin/settings";
import { listTeam } from "@/lib/admin/team";
import { requireAdmin } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";
import { AnnouncementForm, DeliverySettingsForm, PaymentSettingsForm, StoreSettingsForm } from "@/components/admin/settings/SettingsForms";
import { TeamManager } from "@/components/admin/settings/TeamManager";

export const metadata: Metadata = { title: "Paramètres" };

/** Paramètres : infos de la boutique, bandeau, livraison, paiement, équipe (propriétaire). */
export default async function AdminSettingsPage() {
  const staff = await requireAdmin();
  const settings = await getAdminSettings();

  if (!settings.ok) {
    return (
      <AdminPage title="Paramètres">
        <p role="alert" className="rounded-card bg-danger-soft p-5 text-danger">
          Paramètres illisibles : {settings.error}. Les migrations (supabase/all-in-one.sql) ont-elles été exécutées ?
        </p>
      </AdminPage>
    );
  }

  const team = staff.role === "owner" ? await listTeam() : null;
  const sections = [
    ["boutique", "Boutique"],
    ["bandeau", "Bandeau"],
    ["livraison", "Livraison"],
    ["paiement", "Paiement"],
    ...(team ? [["equipe", "Équipe"]] : []),
  ];

  return (
    <AdminPage title="Paramètres" description="Tout ce qui est enregistré ici s'applique immédiatement au site.">
      <nav aria-label="Sections" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex min-h-10 items-center rounded-full bg-surface px-4 text-sm font-semibold whitespace-nowrap ring-1 ring-line hover:ring-fg/40">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-6 [&>div]:scroll-mt-20">
        <div id="boutique">
          <StoreSettingsForm initial={settings.store} />
        </div>
        <div id="bandeau">
          <AnnouncementForm initial={settings.announcement} />
        </div>
        <div id="livraison">
          <DeliverySettingsForm initial={settings.delivery} />
        </div>
        <div id="paiement">
          <PaymentSettingsForm initial={settings.payment} />
        </div>
        {team && (
          <div id="equipe">
            {team.ok ? (
              <TeamManager members={team.members} />
            ) : (
              <p className="rounded-card bg-surface p-5 text-sm text-muted shadow-soft">La gestion de l&apos;équipe apparaîtra après la mise à jour de la base (fichier all-in-one.sql).</p>
            )}
          </div>
        )}
      </div>
    </AdminPage>
  );
}
