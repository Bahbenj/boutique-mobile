import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Client = un numéro de téléphone, d'après les commandes et les demandes de réparation. */
export type Customer = {
  phone: string;
  name: string;
  ordersCount: number;
  totalSpent: number;
  repairsCount: number;
  lastActivity: string;
};

export type CustomerSort = "recent" | "depenses" | "commandes";
export const customerSorts: Record<CustomerSort, string> = {
  recent: "Activité récente",
  depenses: "Plus gros acheteurs",
  commandes: "Plus de commandes",
};

export async function listCustomers(q: string | undefined, sort: CustomerSort) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customers", { p_q: q ?? null, p_sort: sort, p_limit: 300 });
  // Fonction absente (migration 19 non appliquée) : la page l'explique
  if (error) return { customers: [] as Customer[], ready: false };
  return {
    ready: true,
    customers: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      phone: String(r.phone),
      name: String(r.name ?? ""),
      ordersCount: Number(r.orders_count ?? 0),
      totalSpent: Number(r.total_spent ?? 0),
      repairsCount: Number(r.repairs_count ?? 0),
      lastActivity: String(r.last_activity),
    })) as Customer[],
  };
}
