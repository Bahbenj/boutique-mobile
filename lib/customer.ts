import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

/**
 * Client connecté (compte client du site), ou null. Indépendant de l'admin :
 * un compte client n'a aucun droit dans /admin (seule la table admins compte).
 * Le JWT est vérifié (getClaims), le profil relu avec la RLS (le sien seulement).
 */
export type Customer = {
  id: string;
  email: string;
  provider: string;
  fullName: string;
  phone: string | null;
  zoneId: string | null;
  city: string;
  address: string;
  cgvAccepted: boolean;
};

export const getCustomer = cache(async (): Promise<Customer | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: p } = await supabase.from("profiles").select("full_name, phone, zone_id, city, address, cgv_accepted_at").eq("id", claims.sub).maybeSingle();
  const app = (claims.app_metadata ?? {}) as { provider?: string };
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    provider: app.provider ?? "email",
    fullName: p?.full_name ?? "",
    phone: p?.phone ?? null,
    zoneId: p?.zone_id ?? null,
    city: p?.city ?? "",
    address: p?.address ?? "",
    cgvAccepted: Boolean(p?.cgv_accepted_at),
  };
});

/** Profil complet pour commander : nom, téléphone malien et CGV acceptées. */
export const profileComplete = (c: Customer) => c.fullName.trim().length >= 2 && Boolean(c.phone) && c.cgvAccepted;
