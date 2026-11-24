import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export type Admin = { id: string; email: string };

/**
 * Administrateur connecté, ou null. Point unique de contrôle d'accès (DAL) :
 * chaque page et chaque Server Action de l'admin l'appelle, en plus du proxy.
 * Le JWT est vérifié (getClaims) puis le rôle relu en base (is_admin).
 */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});

/** Redirige vers la connexion si l'utilisateur n'est pas administrateur. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Cible de redirection après connexion : chemin interne à /admin uniquement. */
export function safeAdminPath(next: unknown) {
  return typeof next === "string" && /^\/admin(\/[\w\-/]*)?$/.test(next) && next !== "/admin/login" ? next : "/admin";
}
