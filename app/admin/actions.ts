"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAdminPath } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide.").max(200),
  password: z.string().min(1, "Mot de passe requis.").max(200),
  next: z.string().optional(),
});

/** Connexion admin : e-mail + mot de passe Supabase, puis vérification du rôle. */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) return { error: "Supabase n'est pas encore configuré (voir .env.example)." };

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Message volontairement identique : ne révèle pas si le compte existe
  if (error) return { error: "E-mail ou mot de passe incorrect.", email };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: "Ce compte n'a pas accès à l'administration.", email };
  }

  redirect(safeAdminPath(parsed.data.next));
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
