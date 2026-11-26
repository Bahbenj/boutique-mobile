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

/** Compte client (inscrit sur le site), jamais un membre de l'équipe (admin_customer_accounts, migration 23). */
export type CustomerAccount = {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  provider: string;
  emailConfirmed: boolean;
  createdAt: string;
  lastSignIn: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

const toAccount = (r: Record<string, unknown>): CustomerAccount => ({
  userId: String(r.user_id),
  email: String(r.email ?? ""),
  fullName: String(r.full_name ?? ""),
  phone: (r.phone as string | null) ?? null,
  provider: String(r.provider ?? "email"),
  emailConfirmed: r.email_confirmed === true,
  createdAt: String(r.created_at),
  lastSignIn: (r.last_sign_in_at as string | null) ?? null,
  ordersCount: Number(r.orders_count ?? 0),
  totalSpent: Number(r.total_spent ?? 0),
  lastOrderAt: (r.last_order_at as string | null) ?? null,
});

export async function listCustomerAccounts(q: string | undefined) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customer_accounts", { p_q: q ?? null });
  if (error) return { accounts: [] as CustomerAccount[], ready: false };
  return { accounts: ((data ?? []) as Record<string, unknown>[]).map(toAccount), ready: true };
}

/** Compte rattaché à une commande (propriétaire et gérant ; null pour un vendeur ou sans compte). */
export async function getCustomerAccount(userId: string | null | undefined) {
  if (!userId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customer_accounts", { p_q: null, p_user: userId });
  if (error || !data?.length) return null;
  return toAccount((data as Record<string, unknown>[])[0]);
}
