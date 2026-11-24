/**
 * Configuration Supabase publique (URL + clé anon). La clé service_role n'est
 * jamais lue ici : voir lib/supabase/service.ts (serveur uniquement).
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** false tant que .env.local n'est pas rempli : l'admin affiche alors la marche à suivre. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
