"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeAdminPath } from "@/lib/auth";
import { isSupabaseConfigured, publicConfigProblem } from "@/lib/supabase/env";
import { classifyAuthError, logSupabaseError, maskEmail } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

/**
 * kind distingue pour l'interface :
 *  - credentials : e-mail ou mot de passe faux ;
 *  - forbidden   : identifiants justes mais compte absent de public.admins ;
 *  - config      : problème côté serveur (clé, URL, base non initialisée).
 */
export type LoginState = {
  kind?: "credentials" | "forbidden" | "config" | "network" | "rate_limit" | "unconfirmed";
  error?: string;
  hint?: string;
  email?: string;
};

const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide.").max(200),
  password: z.string().min(1, "Mot de passe requis.").max(200),
  next: z.string().optional(),
});

const CONFIG_HINT = "Détails dans le terminal du serveur.";

/** Connexion admin : e-mail + mot de passe Supabase, puis vérification du rôle. */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured) {
    return { kind: "config", error: "Supabase n'est pas configuré.", hint: "Renseignez .env.local (voir .env.example) puis redémarrez le serveur." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { kind: "credentials", error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const kind = classifyAuthError(error);
    // Erreur réelle dans le terminal : jamais le mot de passe ni les clés
    logSupabaseError("connexion admin refusée", error, { email: maskEmail(parsed.data.email), classe: kind });
    switch (kind) {
      case "credentials":
        // Message identique que le compte existe ou non : ne révèle rien
        return { kind, error: "E-mail ou mot de passe incorrect.", email };
      case "unconfirmed":
        return { kind, error: "Ce compte n'est pas confirmé.", hint: "Supabase → Authentication → Users : confirmez l'utilisateur.", email };
      case "rate_limit":
        return { kind, error: "Trop de tentatives. Réessayez dans quelques minutes.", email };
      case "network":
        return { kind, error: "Supabase est injoignable.", hint: "Vérifiez NEXT_PUBLIC_SUPABASE_URL et la connexion internet. " + CONFIG_HINT, email };
      case "config": {
        const problem = publicConfigProblem();
        if (problem) console.error(`[supabase] indice de configuration : ${problem}`);
        return {
          kind,
          error: "Erreur de configuration : Supabase refuse la clé publique.",
          hint: (problem ?? "Vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local, puis redémarrez le serveur.") + " " + CONFIG_HINT,
          email,
        };
      }
      default:
        return { kind: "config", error: "Erreur inattendue de Supabase.", hint: CONFIG_HINT, email };
    }
  }

  // Identifiants valides : le compte est-il administrateur ?
  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  if (roleError) {
    logSupabaseError("vérification du rôle admin impossible", roleError, { email: maskEmail(parsed.data.email) });
    await supabase.auth.signOut();
    const missing = roleError.code === "PGRST202" || /could not find the function/i.test(roleError.message);
    return {
      kind: "config",
      error: "Erreur de configuration : impossible de vérifier le rôle administrateur.",
      hint: (missing ? "La fonction is_admin() est absente : exécutez supabase/all-in-one.sql. " : "") + CONFIG_HINT,
      email,
    };
  }
  if (isAdmin !== true) {
    console.error("[supabase] connexion réussie mais compte non administrateur", { email: maskEmail(parsed.data.email) });
    await supabase.auth.signOut();
    return {
      kind: "forbidden",
      error: "Ce compte n'est pas autorisé à accéder à l'administration.",
      hint: "Ajoutez-le dans la table public.admins (voir supabase/README.md, étape 3).",
      email,
    };
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
