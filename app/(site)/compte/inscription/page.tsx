import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/safe-path";
import { GoogleButton, OrDivider, SignupForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

/** Inscription courte : Google, ou nom, e-mail, téléphone, mot de passe et CGV. */
export default function SignupPage({ searchParams }: PageProps<"/compte/inscription">) {
  return (
    <Suspense>
      <Signup searchParams={searchParams} />
    </Suspense>
  );
}

async function Signup({ searchParams }: Pick<PageProps<"/compte/inscription">, "searchParams">) {
  const next = safeNextPath((await searchParams).next, "/compte");
  return (
    <AuthShell
      title="Créer un compte"
      lead="Une minute suffit. Vous suivez ensuite vos commandes et vos réparations depuis votre téléphone."
      footer={
        <>
          Déjà un compte&nbsp;?{" "}
          <Link href={`/compte/connexion?next=${encodeURIComponent(next)}`} className="font-semibold text-accent underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <GoogleButton next={next} />
      <OrDivider />
      <SignupForm next={next} />
    </AuthShell>
  );
}
