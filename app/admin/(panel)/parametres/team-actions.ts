"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/admin/schema";
import { requireOwner, requireStaff } from "@/lib/auth";
import { logSupabaseError, maskEmail } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Équipe : le propriétaire crée l'accès d'un employé (Gérant ou Vendeur) avec
 * un mot de passe provisoire à lui transmettre, change son rôle ou le retire.
 * Chaque action revérifie le propriétaire (requireOwner) ; la base aussi
 * (owner_add_member, owner_set_role, owner_remove_member : is_owner()).
 */

const roleSchema = z.enum(["manager", "seller"]);
const UUID = z.uuid();

const messages: Record<string, string> = {
  is_owner: "Ce compte est propriétaire : il se gère dans Supabase.",
  user_not_found: "Compte introuvable.",
  not_found: "Ce membre n'existe plus ou est propriétaire.",
  invalid_role: "Rôle invalide.",
};
const friendly = (message: string) => messages[Object.keys(messages).find((k) => message.includes(k)) ?? ""] ?? "Le changement n'a pas été enregistré. Réessayez.";

/** Mot de passe provisoire lisible (sans 0/O ni 1/I/L) : « K7RM-4XPT-Q9HW ». */
function tempPassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((g) => g.join("")).join("-");
}

export async function addTeamMember(input: { email: string; role: string }): Promise<ActionResult<{ password: string | null }>> {
  await requireOwner();
  const parsed = z.object({ email: z.email("Adresse e-mail invalide.").max(200), role: roleSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Champs invalides.", fields: { email: parsed.error.issues[0]?.message ?? "" } };
  const email = parsed.data.email.trim().toLowerCase();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "Clé SUPABASE_SERVICE_ROLE_KEY absente : impossible de créer un compte." };

  // 1. Compte de connexion (déjà existant : on garde son mot de passe)
  let password: string | null = tempPassword();
  const { error: createError } = await createServiceClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (createError) {
    const exists = createError.code === "email_exists" || /already (been )?registered/i.test(createError.message);
    if (!exists) {
      logSupabaseError("création d'un membre", createError, { email: maskEmail(email) });
      return { ok: false, error: "Le compte n'a pas pu être créé. Réessayez." };
    }
    password = null;
  }

  // 2. Rôle, avec la session du propriétaire (vérifié en base)
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_add_member", { p_email: email, p_role: parsed.data.role });
  if (error) return { ok: false, error: friendly(error.message) };
  refresh();
  return { ok: true, data: { password } };
}

export async function setTeamRole(userId: string, role: string): Promise<ActionResult> {
  await requireOwner();
  if (!UUID.safeParse(userId).success || !roleSchema.safeParse(role).success) return { ok: false, error: "Rôle invalide." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_set_role", { p_user: userId, p_role: role });
  if (error) return { ok: false, error: friendly(error.message) };
  refresh();
  return { ok: true };
}

/** Retire l'accès à l'administration (le compte de connexion reste, sans aucun droit). */
export async function removeTeamMember(userId: string): Promise<ActionResult> {
  await requireOwner();
  if (!UUID.safeParse(userId).success) return { ok: false, error: "Membre introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("owner_remove_member", { p_user: userId });
  if (error) return { ok: false, error: friendly(error.message) };
  refresh();
  return { ok: true };
}

/** Chaque membre change son propre mot de passe (Mon compte). */
export async function changeMyPassword(password: string): Promise<ActionResult> {
  await requireStaff();
  const parsed = z.string().min(8, "8 caractères au moins.").max(72, "72 caractères au plus.").safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, fields: { password: parsed.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (/different from the old|same_password/i.test(error.message + (error.code ?? ""))) return { ok: false, error: "Choisissez un mot de passe différent de l'actuel." };
    if (/weak|pwned/i.test(error.message + (error.code ?? ""))) return { ok: false, error: "Mot de passe trop simple : mélangez lettres et chiffres." };
    logSupabaseError("changement de mot de passe", error);
    return { ok: false, error: "Le mot de passe n'a pas été changé. Réessayez." };
  }
  return { ok: true };
}
