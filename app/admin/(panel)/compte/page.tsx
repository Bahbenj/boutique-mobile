import type { Metadata } from "next";
import { roleLabels, requireStaff } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";
import { PasswordForm } from "@/components/admin/settings/PasswordForm";

export const metadata: Metadata = { title: "Mon compte" };

/** Mon compte : rôle et mot de passe (toute l'équipe). */
export default async function AdminAccountPage() {
  const staff = await requireStaff();
  return (
    <AdminPage title="Mon compte" description={`${staff.email} · ${roleLabels[staff.role]}`}>
      <PasswordForm />
    </AdminPage>
  );
}
