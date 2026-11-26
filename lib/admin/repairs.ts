import "server-only";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { repairStatuses, type DbRepair, type RepairStatus } from "./repairs-shared";

/** Lectures des demandes de réparation pour l'admin (session admin, soumises à la RLS). */

export type RepairFilters = { statut?: RepairStatus; q?: string; page?: number };
export const REPAIRS_PER_PAGE = 30;

const toRepair = (row: Record<string, unknown>) =>
  ({ ...row, quote_amount: row.quote_amount == null ? null : Number(row.quote_amount) }) as DbRepair;

export async function listRepairs(filters: RepairFilters) {
  await requireStaff();
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  let query = supabase.from("repair_requests").select("*", { count: "exact" });
  if (filters.statut) query = query.eq("status", filters.statut);
  // Recherche : caractères de la syntaxe PostgREST neutralisés
  const q = filters.q?.replace(/[,()%*\\]/g, " ").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    query = query.or(
      [`number.ilike.%${q}%`, `customer_name.ilike.%${q}%`, `device.ilike.%${q}%`, digits.length >= 3 ? `phone.ilike.%${digits}%` : null]
        .filter(Boolean)
        .join(","),
    );
  }
  const from = (page - 1) * REPAIRS_PER_PAGE;
  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + REPAIRS_PER_PAGE - 1);
  if (error) return { error: error.message, repairs: [] as DbRepair[], count: 0, page };
  return { repairs: (data ?? []).map(toRepair), count: count ?? 0, page };
}

export async function countRepairsByStatus() {
  await requireStaff();
  const supabase = await createClient();
  const results = await Promise.all(
    repairStatuses.map((s) => supabase.from("repair_requests").select("id", { count: "exact", head: true }).eq("status", s)),
  );
  return Object.fromEntries(repairStatuses.map((s, i) => [s, results[i].count ?? 0])) as Record<RepairStatus, number>;
}

export async function getRepair(id: string) {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("repair_requests").select("*").eq("id", id).maybeSingle();
  return data ? toRepair(data) : null;
}
