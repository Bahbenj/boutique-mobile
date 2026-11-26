import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      lead="Indiquez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau."
      footer={
        <Link href="/compte/connexion" className="font-semibold text-accent underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
