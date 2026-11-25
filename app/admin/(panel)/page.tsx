import type { Metadata } from "next";
import { getDashboard } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

/** Tableau de bord : commandes, réparations, activité, stock (voir components/admin/dashboard). */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const data = await getDashboard();

  if ("error" in data) {
    return (
      <AdminPage title="Tableau de bord">
        <p role="alert" className="rounded-card bg-danger-soft p-5 text-danger">
          Statistiques indisponibles : {data.error.message}. Les migrations (supabase/all-in-one.sql, jusqu&apos;à la 14) ont-elles été
          exécutées ?
        </p>
      </AdminPage>
    );
  }

  return <Dashboard email={admin.email} data={data} />;
}
