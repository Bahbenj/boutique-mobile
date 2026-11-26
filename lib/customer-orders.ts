import "server-only";
import type { OrderStatus } from "@/lib/admin/orders-shared";
import type { RepairStatus } from "@/lib/admin/repairs-shared";
import { createClient } from "@/lib/supabase/server";

/**
 * Lectures de l'espace « Mon compte », avec la session du client : la RLS ne
 * renvoie que SES commandes ; historique et réparations passent par des
 * fonctions qui masquent les e-mails de l'équipe et les notes internes.
 */

export type MyOrderLine = { name: string; color: string | null; storage: string | null; qty: number; price: number; image?: string | null; slug?: string };
export type MyOrder = {
  id: string;
  number: string;
  status: OrderStatus;
  created_at: string;
  subtotal: number;
  discount: number;
  promo_code: string | null;
  delivery_fee: number;
  total: number;
  region: string;
  city: string;
  address: string;
  delivery_method: string;
  payment_method: string;
  items: MyOrderLine[];
};

const ORDER_COLUMNS = "id, number, status, created_at, subtotal, discount, promo_code, delivery_fee, total, region, city, address, delivery_method, payment_method, items";

const toOrder = (r: Record<string, unknown>) =>
  ({
    ...r,
    subtotal: Number(r.subtotal),
    discount: Number(r.discount ?? 0),
    delivery_fee: Number(r.delivery_fee),
    total: Number(r.total),
    items: ((r.items as MyOrderLine[]) ?? []).map((l) => ({ ...l, qty: Number(l.qty), price: Number(l.price) })),
  }) as MyOrder;

export async function listMyOrders(limit = 50) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return [];
  const { data } = await supabase.from("orders").select(ORDER_COLUMNS).eq("user_id", auth.claims.sub).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(toOrder);
}

export async function getMyOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const [{ data }, { data: history }] = await Promise.all([
    supabase.from("orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle(), // RLS : la sienne uniquement
    supabase.rpc("my_order_history", { p_order: id }),
  ]);
  if (!data) return null;
  return { order: toOrder(data), history: (history ?? []) as { to_status: OrderStatus; created_at: string }[] };
}

export type MyRepair = { id: string; number: string; device: string; issue: string; status: RepairStatus; quote_amount: number | null; created_at: string; updated_at: string };

export async function listMyRepairs() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_repairs");
  return ((data ?? []) as MyRepair[]).map((r) => ({ ...r, quote_amount: r.quote_amount == null ? null : Number(r.quote_amount) }));
}

/** Libellés pour le client (suivi de commande). */
export const customerStatus: Record<OrderStatus, { label: string; help: string }> = {
  nouvelle: { label: "Reçue", help: "Nous allons vous appeler ou vous écrire pour confirmer." },
  confirmee: { label: "Confirmée", help: "Votre commande est en préparation." },
  expediee: { label: "En livraison", help: "Le livreur est en route." },
  livree: { label: "Livrée", help: "Merci pour votre confiance !" },
  annulee: { label: "Annulée", help: "Cette commande a été annulée." },
};
