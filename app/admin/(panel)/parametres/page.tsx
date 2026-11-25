import type { Metadata } from "next";
import { getAdminSettings } from "@/lib/admin/settings";
import { AdminPage } from "@/components/admin/AdminPage";
import { DeliverySettingsForm, PaymentSettingsForm } from "@/components/admin/settings/SettingsForms";

export const metadata: Metadata = { title: "Paramètres" };

/** Paramètres de la boutique : zones et frais de livraison, retrait, modes de paiement. */
export default async function AdminSettingsPage() {
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

  return (
    <AdminPage title="Paramètres" description="Livraison et paiement, appliqués immédiatement à la page Commande du site.">
      <div className="space-y-6">
        <DeliverySettingsForm initial={settings.delivery} />
        <PaymentSettingsForm initial={settings.payment} />
      </div>
    </AdminPage>
  );
}
