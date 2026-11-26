import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/safe-path";
import { Alert, GoogleButton, LoginPanel, OrDivider } from "@/components/account/AuthForms";
import { AuthShell, linkErrors } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

/** Connexion client : Google d'abord, puis mot de passe ou lien par e-mail. */
export default function LoginPage({ searchParams }: PageProps<"/compte/connexion">) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/compte/connexion">, "searchParams">) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next, "/compte");
  const error = typeof sp.erreur === "string" ? linkErrors[sp.erreur] : undefined;
  const fromCheckout = next === "/commande";
  return (
    <AuthShell
      title="Connexion"
      lead={fromCheckout ? "Connectez-vous pour valider votre commande : votre panier est gardé." : "Pour commander, suivre vos commandes et vos réparations."}
      footer={
        <>
          Pas encore de compte&nbsp;?{" "}
          <Link href={`/compte/inscription?next=${encodeURIComponent(next)}`} className="font-semibold text-accent underline-offset-4 hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <GoogleButton next={next} />
      <OrDivider />
      <LoginPanel next={next} />
    </AuthShell>
  );
}
