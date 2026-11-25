import "server-only";
import { paymentMethods, siteConfig } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DbReview, DeliveryInput, PaymentInput, ZoneInput } from "./settings-schema";

/** Lectures des paramètres et des avis pour l'admin (session admin, RLS). */

export type AdminSettings =
  | { ok: true; delivery: DeliveryInput; payment: PaymentInput }
  | { ok: false; error: string };

export async function getAdminSettings(): Promise<AdminSettings> {
  await requireAdmin();
  const supabase = await createClient();
  const [zonesRes, settingsRes] = await Promise.all([
    supabase.from("delivery_zones").select("id, name, zone_group, fee, delay, is_active").order("position"),
    supabase.from("settings").select("key, value").in("key", ["delivery", "payment"]),
  ]);
  const error = zonesRes.error ?? settingsRes.error;
  if (error) return { ok: false, error: error.message };

  const byKey = new Map((settingsRes.data ?? []).map((s) => [s.key as string, s.value]));
  const delivery = (byKey.get("delivery") ?? {}) as { free_from?: number | null; pickup?: Partial<DeliveryInput["pickup"]> };
  const payment = (byKey.get("payment") ?? {}) as { methods?: PaymentInput["methods"] };

  const zones: ZoneInput[] = (zonesRes.data ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    zone_group: z.zone_group,
    fee: Number(z.fee),
    delay: z.delay,
    is_active: z.is_active,
  }));

  // Modes connus du site, dans l'ordre de config/site.ts, complétés par la base
  const saved = new Map((payment.methods ?? []).map((m) => [m.id, m]));
  const methods = paymentMethods.map(({ id, label, account, instructions, enabled }) => ({
    id,
    label,
    account,
    instructions,
    enabled,
    ...saved.get(id),
  }));

  return {
    ok: true,
    delivery: {
      free_from: "free_from" in delivery ? (delivery.free_from ?? null) : siteConfig.delivery.freeFrom,
      pickup: { enabled: true, ...siteConfig.delivery.pickup, ...delivery.pickup },
      zones,
    },
    payment: { methods },
  };
}

export type AdminReviews = { ok: true; reviews: DbReview[] } | { ok: false; error: string };

export async function listReviews(): Promise<AdminReviews> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, name, city, rating, text, product, is_published, position, created_at")
    .order("position")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, reviews: (data ?? []) as DbReview[] };
}
