import type { Metadata } from "next";
import { NewPasswordForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

/** Après le lien « mot de passe oublié » (session de récupération), ou depuis Mon compte. */
export default function NewPasswordPage() {
  return (
    <AuthShell title="Nouveau mot de passe" lead="8 caractères au moins. Choisissez-en un que vous seul connaissez.">
      <NewPasswordForm />
    </AuthShell>
  );
}
