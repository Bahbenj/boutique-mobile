import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Client « service_role » : contourne la Row Level Security.
 * SERVEUR UNIQUEMENT (import "server-only" fait échouer le build si un
 * composant client l'importe). Sert seulement à appeler place_order().
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante (voir .env.example)");
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
