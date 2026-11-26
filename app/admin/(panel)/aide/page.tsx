import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";
import { QuickGuide } from "@/components/admin/help/QuickGuide";

export const metadata: Metadata = { title: "Guide rapide" };

/** Guide rapide : les gestes de tous les jours, adaptés au rôle. */
export default async function AdminHelpPage() {
  const staff = await requireStaff();
  return (
    <AdminPage
      title="Guide rapide"
      description={
        <>
          Les gestes de tous les jours, depuis votre téléphone. Les petits <span className="font-bold text-fg">?</span> dans les formulaires expliquent chaque réglage.
        </>
      }
    >
      <QuickGuide seller={staff.role === "seller"} />
    </AdminPage>
  );
}
