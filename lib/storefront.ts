import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { deliveryZones, paymentMethods, siteConfig, type DeliveryZone, type PaymentMethod } from "@/config/site";
import type { Review } from "@/data/home";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Données publiques réglées dans l'admin : zones et frais de livraison, modes
 * de paiement, avis clients. Lues avec la clé publique (soumise à la RLS),
 * mises en cache et invalidées par l'admin (updateTag "settings" / "reviews").
 * Tant que Supabase n'est pas branché, on se replie sur config/site.ts et
 * data/home.ts : le site fonctionne sans base.
 */

export const SETTINGS_TAG = "settings";
export const REVIEWS_TAG = "reviews";

export type CheckoutSettings = {
  zones: DeliveryZone[]; // zones actives seulement, dans l'ordre d'affichage
  payments: PaymentMethod[]; // modes activés seulement
  freeFrom: number | null;
  pickup: { enabled: boolean; label: string; delay: string };
};

const fallbackCheckout = (): CheckoutSettings => ({
  zones: deliveryZones.filter((z) => z.active),
  payments: paymentMethods.filter((m) => m.enabled),
  freeFrom: siteConfig.delivery.freeFrom,
  pickup: { enabled: true, ...siteConfig.delivery.pickup },
});

/** Client anonyme sans session : lecture publique uniquement. */
const publicClient = () => createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return fallbackCheckout();

  const supabase = publicClient();
  const [zonesRes, settingsRes] = await Promise.all([
    supabase.from("delivery_zones").select("id, name, zone_group, fee, delay, is_active").eq("is_active", true).order("position"),
    supabase.from("settings").select("key, value").in("key", ["delivery", "payment"]),
  ]);
  if (zonesRes.error || settingsRes.error) {
    console.error("[storefront] paramètres de commande illisibles, repli sur config/site.ts", zonesRes.error ?? settingsRes.error);
    return fallbackCheckout();
  }

  const fallback = fallbackCheckout();
  const byKey = new Map((settingsRes.data ?? []).map((s) => [s.key as string, s.value as Record<string, unknown>]));
  const delivery = byKey.get("delivery") as { free_from?: number | null; pickup?: Partial<CheckoutSettings["pickup"]> } | undefined;
  const payment = byKey.get("payment") as { methods?: PaymentMethod[] } | undefined;

  const zones: DeliveryZone[] = (zonesRes.data ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    group: z.zone_group,
    fee: Number(z.fee),
    delay: z.delay,
    active: z.is_active,
  }));
  const knownIds = new Set(paymentMethods.map((m) => m.id));
  const payments = (payment?.methods ?? []).filter((m) => m.enabled && knownIds.has(m.id));

  return {
    zones: zones.length || delivery ? zones : fallback.zones,
    payments: payments.length ? payments : fallback.payments,
    freeFrom: delivery && "free_from" in delivery ? (delivery.free_from ?? null) : fallback.freeFrom,
    pickup: { ...fallback.pickup, ...delivery?.pickup },
  };
}

/** Avis publiés (admin → Avis). Sans base : aucun avis, la section reste masquée. */
export async function getPublishedReviews(): Promise<Review[]> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("hours");
  if (!isSupabaseConfigured) return [];

  const { data, error } = await publicClient()
    .from("reviews")
    .select("name, city, rating, text, product")
    .eq("is_published", true)
    .order("position")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) {
    // Table absente (migration 9 non exécutée) ou autre : on masque la section
    console.error("[storefront] avis illisibles", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ name: r.name, city: r.city, rating: r.rating, text: r.text, product: r.product ?? undefined }));
}
