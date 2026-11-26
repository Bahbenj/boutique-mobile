import "server-only";
import { paymentMethods, siteConfig } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMlPhone } from "@/lib/phone";
import { mergeStoreInfo } from "@/lib/store-info";
import type { AnnouncementInput, DbReview, DeliveryInput, PaymentInput, StoreInput, ZoneInput } from "./settings-schema";

/** Lectures des paramètres et des avis pour l'admin (session admin, RLS). */

export type AdminSettings =
  | { ok: true; delivery: DeliveryInput; payment: PaymentInput; store: StoreInput; announcement: AnnouncementInput }
  | { ok: false; error: string };

export async function getAdminSettings(): Promise<AdminSettings> {
  await requireAdmin();
  const supabase = await createClient();
  const [zonesRes, settingsRes] = await Promise.all([
    supabase.from("delivery_zones").select("id, name, zone_group, fee, delay, is_active").order("position"),
    supabase.from("settings").select("key, value").in("key", ["delivery", "payment", "store", "announcement"]),
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

  // Infos de la boutique : mêmes valeurs que celles affichées sur le site
  const info = mergeStoreInfo(byKey.get("store"));
  const local = (p: string) => formatMlPhone(p.replace(/\D/g, "").replace(/^(00)?223(?=\d{8}$)/, ""));
  const ann = (byKey.get("announcement") ?? {}) as Partial<AnnouncementInput>;

  return {
    ok: true,
    store: {
      whatsapp: local(info.whatsapp),
      phone: local(info.phone),
      phone2: info.phones[1] ? local(info.phones[1]) : "",
      email: info.email,
      street: info.address.street,
      district: info.address.district,
      city: info.address.city,
      map_url: info.mapUrl,
      hours: info.hours,
      facebook: info.social.facebook,
      tiktok: info.social.tiktok,
      instagram: info.social.instagram,
    },
    announcement: { enabled: ann.enabled === true, text: typeof ann.text === "string" ? ann.text : "", link: typeof ann.link === "string" ? ann.link : "" },
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
