"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { addressSchema, toSavedAddress, type AddressInput, type SavedAddress } from "@/lib/customer-addresses";
import { normalizeMlPhone } from "@/lib/phone";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/** Carnet d'adresses : ajouter, modifier, supprimer, adresse par défaut (ses adresses seulement : RLS). */

export type AddressResult = { ok: true; address?: SavedAddress } | { ok: false; error: string; fields?: Record<string, string> };

const COLUMNS = "id, label, recipient_name, phone, zone_id, city, address, instructions, lat, lng, is_default";


export async function saveAddress(input: AddressInput): Promise<AddressResult> {
  const phone = normalizeMlPhone(String(input.phone ?? ""));
  const parsed = addressSchema.safeParse({ ...input, phone: phone ?? "" });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Vérifiez les champs signalés.", fields };
  }
  const { id, ...data } = parsed.data;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { ok: false, error: "Connectez-vous pour enregistrer une adresse." };
  const query = id ? supabase.from("customer_addresses").update(data).eq("id", id) : supabase.from("customer_addresses").insert(data);
  const { data: row, error } = await query.select(COLUMNS).maybeSingle();
  if (error || !row) {
    if (error?.message.includes("too_many_addresses")) return { ok: false, error: "10 adresses au plus : supprimez-en une pour en ajouter une autre." };
    if (error) logSupabaseError("carnet d'adresses", error);
    return { ok: false, error: "L'adresse n'a pas été enregistrée. Réessayez." };
  }
  refresh();
  return { ok: true, address: toSavedAddress(row) };
}

export async function deleteAddress(id: string): Promise<AddressResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Adresse introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_addresses").delete().eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Suppression impossible." };
  refresh();
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<AddressResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Adresse introuvable." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("customer_addresses").update({ is_default: true }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Changement impossible." };
  refresh();
  return { ok: true };
}
