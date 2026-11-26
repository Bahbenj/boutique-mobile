import type { Metadata } from "next";
import Link from "next/link";
import { customerSorts, listCustomerAccounts, listCustomers, type CustomerSort } from "@/lib/admin/customers";
import { cn } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { AccountList } from "@/components/admin/customers/AccountList";
import { CustomerList } from "@/components/admin/customers/CustomerList";
import { CustomerSearch } from "@/components/admin/customers/CustomerSearch";

export const metadata: Metadata = { title: "Clients" };

const empty = (title: string, text: string) => (
  <div className="rounded-card bg-surface p-6 text-center shadow-soft">
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm text-muted">{text}</p>
  </div>
);

/**
 * Clients : onglet « Comptes » (inscrits sur le site, jamais l'équipe) et onglet
 * « Tous les numéros » (commandes et réparations regroupées par téléphone,
 * y compris celles passées avant les comptes).
 */
export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/clients">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const view = sp.vue === "numeros" ? "numeros" : "comptes";
  const sort = (typeof sp.tri === "string" && sp.tri in customerSorts ? sp.tri : "recent") as CustomerSort;
  const tab = (v: string) => `/admin/clients?vue=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <AdminPage title="Clients" description="Comptes inscrits sur le site et tous les numéros qui ont commandé ou demandé une réparation">
      <nav aria-label="Affichage" className="mb-4 flex gap-1 rounded-full bg-surface p-1 shadow-soft sm:inline-flex">
        {(
          [
            ["comptes", "Comptes"],
            ["numeros", "Tous les numéros"],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={tab(v)}
            aria-current={view === v ? "page" : undefined}
            className={cn("flex h-11 flex-1 items-center justify-center rounded-full px-5 text-sm font-semibold whitespace-nowrap", view === v ? "bg-fg text-canvas" : "text-muted hover:text-fg")}
          >
            {label}
          </Link>
        ))}
      </nav>
      <CustomerSearch sorts={view === "numeros" ? customerSorts : {}} />
      <div className="mt-4">{view === "comptes" ? <Accounts q={q} /> : <Numbers q={q} sort={sort} />}</div>
    </AdminPage>
  );
}

async function Accounts({ q }: { q?: string }) {
  const { accounts, ready } = await listCustomerAccounts(q);
  if (!ready) return empty("Comptes indisponibles.", "Ils apparaîtront après la mise à jour de la base (fichier all-in-one.sql).");
  if (!accounts.length)
    return q ? empty(`Aucun compte pour « ${q} ».`, "Cherchez par nom, e-mail ou téléphone.") : empty("Pas encore de compte client.", "Chaque client qui s'inscrit sur le site apparaît ici.");
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        {accounts.length} compte{accounts.length > 1 ? "s" : ""}
        {accounts.length >= 300 && " (les 300 premiers : précisez la recherche)"}
      </p>
      <AccountList accounts={accounts} />
    </>
  );
}

async function Numbers({ q, sort }: { q?: string; sort: CustomerSort }) {
  const { customers, ready } = await listCustomers(q, sort);
  if (!ready) return empty("Liste indisponible.", "Elle apparaîtra après la mise à jour de la base (fichier all-in-one.sql).");
  if (!customers.length)
    return q
      ? empty(`Aucun client pour « ${q} ».`, "Vérifiez le numéro ou essayez une partie du nom.")
      : empty("Pas encore de client.", "Chaque commande ou demande de réparation ajoute son auteur ici, automatiquement.");
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        {customers.length} client{customers.length > 1 ? "s" : ""}
        {customers.length >= 300 && " (les 300 premiers : précisez la recherche)"}
      </p>
      <CustomerList customers={customers} />
    </>
  );
}
