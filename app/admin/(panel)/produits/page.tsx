import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = { title: "Produits" };

/** Emplacement réservé : construit à l'étape 2 de l'administration. */
export default async function Page() {
  await requireAdmin();
  return (
    <AdminPage title="Produits">
      <p className="rounded-card bg-white p-6 text-muted shadow-soft">Cette section arrive à l&apos;étape 2.</p>
    </AdminPage>
  );
}
