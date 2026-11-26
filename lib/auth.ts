import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

/** owner = propriétaire (tout + équipe) ; manager = gérant (tout) ; seller = vendeur (commandes, réparations, stock). */
export type StaffRole = "owner" | "manager" | "seller";
export type Staff = { id: string; email: string; role: StaffRole };
/** Compatibilité : un « admin » est un membre de l'équipe (voir requireAdmin pour le rôle). */
export type Admin = Staff;

export const roleLabels: Record<StaffRole, string> = { owner: "Propriétaire", manager: "Gérant", seller: "Vendeur" };

/**
 * Membre de l'équipe connecté, ou null. Point unique de contrôle d'accès (DAL) :
 * chaque page et chaque Server Action de l'admin passe par requireStaff,
 * requireAdmin ou requireOwner, en plus du proxy. Le JWT est vérifié
 * (getClaims) puis le rôle relu en base (staff_role, migration 20).
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const email = typeof claims.email === "string" ? claims.email : "";

  const { data: role, error } = await supabase.rpc("staff_role");
  if (error) {
    // Base sans la migration 20 : seuls les administrateurs existent, tous propriétaires
    const { data: isAdmin } = await supabase.rpc("is_admin");
    return isAdmin === true ? { id: claims.sub, email, role: "owner" } : null;
  }
  return role === "owner" || role === "manager" || role === "seller" ? { id: claims.sub, email, role } : null;
});

/** Propriétaire ou gérant (accès complet), sinon null. */
export const getAdmin = cache(async (): Promise<Staff | null> => {
  const staff = await getStaff();
  return staff && staff.role !== "seller" ? staff : null;
});

/** Toute l'équipe : commandes, réparations, stock. Sinon, page de connexion. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/** Propriétaire ou gérant. Un vendeur est renvoyé vers les commandes (son écran d'accueil). */
export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role === "seller") redirect("/admin/commandes");
  return staff;
}

/** Propriétaire seul (gestion de l'équipe, journal d'activité). */
export async function requireOwner(): Promise<Staff> {
  const staff = await requireAdmin();
  if (staff.role !== "owner") redirect("/admin");
  return staff;
}

/** Cible de redirection après connexion : chemin interne à /admin uniquement. */
export function safeAdminPath(next: unknown) {
  return typeof next === "string" && /^\/admin(\/[\w\-/]*)?$/.test(next) && next !== "/admin/login" ? next : "/admin";
}
