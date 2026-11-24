import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = { title: "Commandes" };

/** Emplacement réservé : construit à l'étape 3 de l'administration. */
export default async function Page() {
  await requireAdmin();
  return (
    <AdminPage title="Commandes">
      <p className="rounded-card bg-white p-6 text-muted shadow-soft">Cette section arrive à l&apos;étape 3.</p>
    </AdminPage>
  );
}
