import "server-only";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLowStockThreshold } from "./stock";
import type { DbRepair } from "./repairs-shared";
import { orderStatuses, periodStart, type DbOrder, type OrderHistoryEntry, type OrderStatus, type Period, type Sort } from "./orders-shared";

/** Lectures des commandes pour l'admin (session admin, soumises à la RLS). */

export type OrderFilters = { statut?: OrderStatus; q?: string; periode?: Period; tri?: Sort; page?: number };
export const ORDERS_PER_PAGE = 30;

const toOrder = (row: Record<string, unknown>) =>
  ({
    ...row,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount ?? 0),
    promo_code: (row.promo_code as string | null) ?? null,
    delivery_fee: Number(row.delivery_fee),
    total: Number(row.total),
    items: ((row.items as DbOrder["items"]) ?? []).map((i) => ({ ...i, price: Number(i.price), qty: Number(i.qty) })),
  }) as DbOrder;

export async function listOrders(filters: OrderFilters) {
  await requireStaff();
  const supabase = await createClient(); // avant tout calcul de date (rendu à la requête)
  const page = Math.max(1, filters.page ?? 1);
  let query = supabase.from("orders").select("*", { count: "exact" });

  if (filters.statut) query = query.eq("status", filters.statut);
  if (filters.periode) query = query.gte("created_at", periodStart(filters.periode));
  const q = filters.q?.replace(/[,()%*\\]/g, " ").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    query = query.or(
      [`number.ilike.%${q}%`, `customer_name.ilike.%${q}%`, digits.length >= 3 ? `phone.ilike.%${digits}%` : null].filter(Boolean).join(","),
    );
  }

  const from = (page - 1) * ORDERS_PER_PAGE;
  const { data, count, error } = await query.order("created_at", { ascending: filters.tri === "ancien" }).range(from, from + ORDERS_PER_PAGE - 1);
  if (error) throw new Error(error.message);
  return { orders: (data ?? []).map(toOrder), count: count ?? 0, page };
}

/** Nombre de commandes par statut (onglets de la liste). */
export async function countByStatus() {
  await requireStaff();
  const supabase = await createClient();
  const results = await Promise.all(
    orderStatuses.map((s) => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", s)),
  );
  return Object.fromEntries(orderStatuses.map((s, i) => [s, results[i].count ?? 0])) as Record<OrderStatus, number>;
}

export async function getOrder(id: string) {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  return data ? toOrder(data) : null;
}

/** Historique des statuts d'une commande, du plus ancien au plus récent. */
export async function getOrderHistory(id: string): Promise<OrderHistoryEntry[]> {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_status_history")
    .select("id, from_status, to_status, changed_by, changed_by_email, created_at")
    .eq("order_id", id)
    .order("created_at")
    .order("id");
  if (error) return []; // migration 12 absente : la fiche reste utilisable sans historique
  return (data ?? []) as OrderHistoryEntry[];
}

/** Toutes les commandes filtrées, pour l'export CSV (plafonné). */
export async function exportOrders(filters: Omit<OrderFilters, "page">) {
  await requireStaff();
  const supabase = await createClient();
  let query = supabase.from("orders").select("*");
  if (filters.statut) query = query.eq("status", filters.statut);
  if (filters.periode) query = query.gte("created_at", periodStart(filters.periode));
  const { data, error } = await query.order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toOrder);
}

// --- Tableau de bord ------------------------------------------------------------------

export type DashboardStats = {
  today: { orders: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number; collected: number; cancelled: number };
  pending: { nouvelle: number; confirmee: number; expediee: number };
  repairs: {
    pending: { nouvelle: number; devis_envoye: number; en_cours: number; prete: number };
    received: { today: number; week: number; month: number };
  };
};

export type DashboardData = {
  stats: DashboardStats;
  latest: DbOrder[];
  latestRepairs: DbRepair[];
  lowStock: { items: { id: string; name: string; stock: number; images: string[] }[]; count: number };
};

export async function getDashboard(): Promise<DashboardData | { error: { message: string } }> {
  await requireAdmin();
  const supabase = await createClient();
  const threshold = await getLowStockThreshold();
  const [stats, latest, lowStock, repairs] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(6),
    supabase
      .from("products")
      .select("id, name, stock, images", { count: "exact" })
      .eq("is_active", true)
      .lte("stock", threshold)
      .order("stock")
      .order("name")
      .limit(8),
    supabase.from("repair_requests").select("*").order("created_at", { ascending: false }).limit(5),
  ]);
  const error = stats.error ?? latest.error ?? lowStock.error ?? repairs.error;
  if (error) return { error };

  const raw = stats.data as DashboardStats;
  const num = (v: unknown) => Number(v ?? 0);
  return {
    stats: {
      today: { orders: num(raw.today.orders), revenue: num(raw.today.revenue) },
      week: { orders: num(raw.week.orders), revenue: num(raw.week.revenue) },
      month: { orders: num(raw.month.orders), revenue: num(raw.month.revenue), collected: num(raw.month.collected), cancelled: num(raw.month.cancelled) },
      pending: { nouvelle: num(raw.pending.nouvelle), confirmee: num(raw.pending.confirmee), expediee: num(raw.pending.expediee) },
      repairs: {
        pending: {
          nouvelle: num(raw.repairs?.pending.nouvelle),
          devis_envoye: num(raw.repairs?.pending.devis_envoye),
          en_cours: num(raw.repairs?.pending.en_cours),
          prete: num(raw.repairs?.pending.prete),
        },
        received: { today: num(raw.repairs?.received.today), week: num(raw.repairs?.received.week), month: num(raw.repairs?.received.month) },
      },
    } satisfies DashboardStats,
    latest: (latest.data ?? []).map(toOrder),
    lowStock: { items: (lowStock.data ?? []) as { id: string; name: string; stock: number; images: string[] }[], count: lowStock.count ?? 0 },
    latestRepairs: (repairs.data ?? []).map((r) => ({ ...r, quote_amount: r.quote_amount == null ? null : Number(r.quote_amount) }) as DbRepair),
  };
}
