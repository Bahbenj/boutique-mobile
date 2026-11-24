import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Client Supabase côté serveur, lié à la session de l'utilisateur (cookies).
 * Soumis à la Row Level Security. Un nouveau client par requête.
 * Lit les cookies : à appeler sous une <Suspense> (Cache Components).
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : écriture impossible, le proxy
          // (proxy.ts) se charge de rafraîchir la session.
        }
      },
    },
  });
}
