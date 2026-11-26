import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountForm } from "@/components/account/AccountForms";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Supprimer mon compte", robots: { index: false } };

/** Suppression du compte et des données personnelles, sur demande du client. */
export default function DeleteAccountPage() {
  return (
    <AuthShell
      title="Supprimer mon compte"
      lead="Votre compte, votre profil et votre adresse enregistrée seront effacés définitivement. Cette action ne peut pas être annulée."
      footer={
        <Link href="/compte" className="font-semibold text-accent underline-offset-4 hover:underline">
          Garder mon compte
        </Link>
      }
    >
      <ul className="mb-5 list-disc space-y-1.5 ps-5 text-sm text-muted">
        <li>Impossible tant qu&apos;une commande ou une réparation est en cours.</li>
        <li>
          Vos commandes passées sont conservées pour notre comptabilité, détachées de votre compte (voir la{" "}
          <Link href="/confidentialite" className="font-semibold text-accent underline-offset-4 hover:underline">
            politique de confidentialité
          </Link>
          ).
        </li>
        <li>Vous pourrez recréer un compte plus tard avec la même adresse.</li>
      </ul>
      <DeleteAccountForm />
    </AuthShell>
  );
}
