import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = { title: "Tableau de bord" };

/**
 * Étape 1 : vérification de la connexion à la base. Le tableau de bord complet
 * (chiffre d'affaires, commandes à traiter, stock faible) arrive à l'étape 3.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const [products, active, categories, orders] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);
  const error = products.error ?? categories.error ?? orders.error;

  const stats = [
    { label: "Produits", value: products.count ?? 0, hint: `${active.count ?? 0} en ligne` },
    { label: "Catégories", value: categories.count ?? 0 },
    { label: "Commandes", value: orders.count ?? 0 },
  ];

  return (
    <AdminPage title="Tableau de bord" description={`Connecté en tant que ${admin.email}`}>
      {error ? (
        <p role="alert" className="rounded-card bg-red-50 p-5 text-red-800">
          Connexion à la base impossible : {error.message}. Les migrations ont-elles été exécutées ?
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <li key={s.label} className="rounded-card bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-muted">{s.label}</p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{s.value}</p>
              {s.hint && <p className="mt-1 text-sm text-muted">{s.hint}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted">Base connectée. Les statistiques détaillées arrivent avec la gestion des commandes.</p>
    </AdminPage>
  );
}
