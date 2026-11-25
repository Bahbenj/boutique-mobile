import type { Metadata } from "next";
import { customerSorts, listCustomers, type CustomerSort } from "@/lib/admin/customers";
import { AdminPage } from "@/components/admin/AdminPage";
import { CustomerList } from "@/components/admin/customers/CustomerList";
import { CustomerSearch } from "@/components/admin/customers/CustomerSearch";

export const metadata: Metadata = { title: "Clients" };

export default async function AdminCustomersPage({ searchParams }: PageProps<"/admin/clients">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : undefined;
  const sort = (typeof sp.tri === "string" && sp.tri in customerSorts ? sp.tri : "recent") as CustomerSort;
  const { customers, ready } = await listCustomers(q, sort);

  return (
    <AdminPage title="Clients" description="Toutes les personnes qui ont commandé ou demandé une réparation">
      <CustomerSearch sorts={customerSorts} />
      <div className="mt-4">
        {!ready ? (
          <p className="rounded-card bg-surface p-6 text-center text-sm text-muted shadow-soft">La liste des clients apparaîtra après la mise à jour de la base (fichier all-in-one.sql).</p>
        ) : customers.length === 0 ? (
          <div className="rounded-card bg-surface p-6 text-center shadow-soft">
            <p className="font-semibold">{q ? `Aucun client pour « ${q} ».` : "Pas encore de client."}</p>
            <p className="mt-1 text-sm text-muted">
              {q ? "Vérifiez le numéro ou essayez une partie du nom." : "Chaque commande ou demande de réparation ajoute son auteur ici, automatiquement."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted">
              {customers.length} client{customers.length > 1 ? "s" : ""}
              {customers.length >= 300 && " (les 300 premiers : précisez la recherche)"}
            </p>
            <CustomerList customers={customers} />
          </>
        )}
      </div>
    </AdminPage>
  );
}
