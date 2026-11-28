/**
 * Configuration Supabase publique (URL + clé anon / publishable). La clé
 * service_role / secret n'est jamais lue ici : voir lib/supabase/service.ts.
 */
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
export const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/**
 * Cookies de session : Secure en production (jamais envoyés hors HTTPS), SameSite=Lax
 * (pas envoyés par les formulaires d'autres sites). Non HttpOnly par conception :
 * le client Supabase du navigateur doit pouvoir lire la session.
 */
export const supabaseCookieOptions = { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" } as const;

/** false tant que .env.local n'est pas rempli : l'admin affiche alors la marche à suivre. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Contrôle de forme des variables (sans jamais renvoyer leur valeur).
 * Repère les erreurs de copier-coller les plus fréquentes : clé tronquée
 * (copiée depuis l'affichage masqué du tableau de bord), guillemets, URL d'API
 * au lieu de l'URL du projet, ou clé secrète mise à la place de la clé publique.
 * Indice de diagnostic seulement, affiché quand Supabase refuse réellement une
 * requête : ne bloque jamais la connexion (le format exact des clés peut évoluer).
 */
export function publicConfigProblem(url = supabaseUrl, key = supabaseAnonKey): string | null {
  if (!url || !key) return "NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY est vide.";
  if (/^["']|["']$/.test(key) || /^["']|["']$/.test(url)) return "Retirez les guillemets autour des valeurs dans .env.local.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL n'est pas une URL valide (attendu : https://<projet>.supabase.co).";
  }
  if (parsed.pathname !== "/") return "NEXT_PUBLIC_SUPABASE_URL doit être l'URL du projet, sans /rest/v1 ni autre chemin.";
  if (key.startsWith("sb_secret_")) return "NEXT_PUBLIC_SUPABASE_ANON_KEY contient la clé SECRÈTE : mettez la clé publishable (sb_publishable_…).";
  if (key.startsWith("sb_publishable_")) {
    if (key.length - "sb_publishable_".length < 30) return "La clé publishable semble tronquée : recopiez-la avec le bouton « Copier » du tableau de bord.";
  } else if (key.startsWith("eyJ")) {
    if (key.split(".").length !== 3) return "La clé anon (eyJ…) semble incomplète : recopiez-la en entier.";
  } else {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY doit commencer par sb_publishable_ (ou eyJ pour l'ancienne clé anon).";
  }
  return null;
}
