import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCustomer } from "@/lib/customer";
import { formatMlPhone } from "@/lib/phone";
import { safeNextPath } from "@/lib/safe-path";
import { CompleteProfileForm } from "@/components/account/AuthForms";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Vos coordonnées", robots: { index: false } };

/** Après Google ou un lien magique : nom, téléphone malien et CGV, demandés une seule fois. */
export default function CompletePage({ searchParams }: PageProps<"/compte/completer">) {
  return (
    <Suspense>
      <Complete searchParams={searchParams} />
    </Suspense>
  );
}

async function Complete({ searchParams }: Pick<PageProps<"/compte/completer">, "searchParams">) {
  const next = safeNextPath((await searchParams).next, "/compte");
  const customer = await getCustomer();
  if (!customer) redirect(`/compte/connexion?next=${encodeURIComponent(next)}`);
  return (
    <AuthShell title="Bienvenue" lead={`Connecté avec ${customer.email}. Il manque juste de quoi vous joindre pour vos commandes.`}>
      <CompleteProfileForm next={next} fullName={customer.fullName} phone={customer.phone ? formatMlPhone(customer.phone) : ""} needsCgv={!customer.cgvAccepted} />
    </AuthShell>
  );
}
