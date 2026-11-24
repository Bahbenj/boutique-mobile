import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Client « service_role » : contourne la Row Level Security.
 * SERVEUR UNIQUEMENT (import "server-only" fait échouer le build si un
 * composant client l'importe). Sert seulement à appeler place_order().
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (voir .env.example)");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Contrôle de forme de la clé secrète (sans jamais renvoyer sa valeur).
 * Indice de diagnostic seulement : n'empêche jamais l'appel à Supabase.
 */
export function serviceKeyProblem(key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ""): string | null {
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY est vide.";
  if (key.startsWith("sb_publishable_")) return "SUPABASE_SERVICE_ROLE_KEY contient la clé publique : mettez la clé secrète (sb_secret_…).";
  if (key.startsWith("sb_secret_")) {
    if (key.length - "sb_secret_".length < 30) return "La clé secrète semble tronquée : recopiez-la avec le bouton « Copier » (après « Reveal ») du tableau de bord.";
  } else if (!key.startsWith("eyJ") || key.split(".").length !== 3) {
    return "SUPABASE_SERVICE_ROLE_KEY doit commencer par sb_secret_ (ou eyJ pour l'ancienne clé service_role).";
  }
  return null;
}
