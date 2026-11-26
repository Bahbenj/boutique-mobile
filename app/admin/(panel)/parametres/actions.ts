"use server";

import { refresh, updateTag } from "next/cache";
import { fieldErrors, type ActionResult } from "@/lib/admin/schema";
import {
  announcementSchema,
  deliverySchema,
  paymentSchema,
  storeSchema,
  type AnnouncementInput,
  type DeliveryInput,
  type PaymentInput,
  type StoreInput,
} from "@/lib/admin/settings-schema";
import { formatMlPhoneIntl } from "@/lib/phone";
import { requireAdmin } from "@/lib/auth";
import { SETTINGS_TAG } from "@/lib/storefront";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/** Paramètres de la boutique : infos et contact, bandeau, livraison (zones, frais, retrait) et paiement. */

function done() {
  updateTag(SETTINGS_TAG); // page Commande du site
  refresh();
}

/** Fusionne avec la valeur existante : les clés inconnues de ce formulaire sont conservées. */
async function saveSetting(supabase: Awaited<ReturnType<typeof createClient>>, key: string, patch: Record<string, unknown>) {
  const { data: current } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  const value = { ...((current?.value as Record<string, unknown> | null) ?? {}), ...patch };
  return supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
}

export async function saveDelivery(input: DeliveryInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deliverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const { free_from, pickup, zones } = parsed.data;

  const supabase = await createClient();
  // Zones : mise à jour des existantes et ajout des nouvelles, dans l'ordre affiché.
  // Une zone ne se supprime pas (historique des commandes) : elle se désactive.
  const { error: zonesError } = await supabase.from("delivery_zones").upsert(
    zones.map(({ id, name, zone_group, fee, delay, is_active }, position) => ({ id, name, zone_group, fee, delay, is_active, position })),
    { onConflict: "id" },
  );
  if (zonesError) return { ok: false, error: "Zones non enregistrées : " + zonesError.message };

  const { error } = await saveSetting(supabase, "delivery", { free_from, pickup });
  if (error) return { ok: false, error: "Livraison non enregistrée : " + error.message };
  done();
  return { ok: true };
}

export async function savePayments(input: PaymentInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await saveSetting(supabase, "payment", { methods: parsed.data.methods });
  if (error) return { ok: false, error: "Paiement non enregistré : " + error.message };
  done();
  return { ok: true };
}

export async function saveStore(input: StoreInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  const phone = formatMlPhoneIntl(d.phone);
  const supabase = await createClient();
  const { data: current } = await supabase.from("settings").select("value").eq("key", "store").maybeSingle();
  const before = (current?.value as Record<string, unknown> | null) ?? {};
  const { error } = await saveSetting(supabase, "store", {
    whatsapp: `223${d.whatsapp}`,
    phone,
    phones: d.phone2 ? [phone, formatMlPhoneIntl(d.phone2)] : [phone],
    email: d.email,
    address: { ...((before.address as object | undefined) ?? {}), street: d.street, district: d.district, city: d.city },
    map_url: d.map_url,
    hours: d.hours,
    social: { ...((before.social as object | undefined) ?? {}), facebook: d.facebook, tiktok: d.tiktok, instagram: d.instagram },
  });
  if (error) {
    logSupabaseError("infos boutique", error);
    return { ok: false, error: "Les infos n'ont pas été enregistrées. Réessayez." };
  }
  done();
  return { ok: true };
}

export async function saveAnnouncement(input: AnnouncementInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Certains champs sont à corriger.", fields: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await saveSetting(supabase, "announcement", parsed.data);
  if (error) {
    logSupabaseError("bandeau", error);
    return { ok: false, error: "Le bandeau n'a pas été enregistré. Réessayez." };
  }
  done();
  return { ok: true };
}
