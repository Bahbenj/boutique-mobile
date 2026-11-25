"use server";

import { refresh, updateTag } from "next/cache";
import { fieldErrors, type ActionResult } from "@/lib/admin/schema";
import { deliverySchema, paymentSchema, type DeliveryInput, type PaymentInput } from "@/lib/admin/settings-schema";
import { requireAdmin } from "@/lib/auth";
import { SETTINGS_TAG } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";

/** Paramètres de la boutique : livraison (zones, frais, retrait) et paiement. */

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
