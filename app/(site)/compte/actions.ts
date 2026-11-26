"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeMlPhone, phoneError } from "@/lib/phone";
import { requestKey, siteOrigin } from "@/lib/request-key";
import { safeNextPath } from "@/lib/safe-path";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { logSupabaseError, maskEmail } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Comptes clients : connexion (Google, mot de passe, lien magique), inscription,
 * mot de passe oublié, profil à compléter, déconnexion. Totalement séparés de
 * l'admin : aucune de ces actions ne touche à la table admins.
 * Limites anti-robots par visiteur et par heure (en base, empreinte de l'IP) :
 * 10 connexions ratées, 5 inscriptions, 5 e-mails (lien, oubli, renvoi).
 */

export type AuthState = {
  error?: string;
  notice?: string;
  /** E-mail à confirmer : propose de renvoyer le lien */
  unconfirmed?: boolean;
  email?: string;
  fields?: Record<string, string>;
};

const LIMITS = { login: 10, signup: 5, email: 5 } as const;
type Bucket = keyof typeof LIMITS;
const TOO_MANY = "Trop d'essais depuis cet appareil. Réessayez dans une heure.";
const UNAVAILABLE = "Les comptes ne sont pas disponibles pour le moment. Réessayez plus tard.";

/** true = encore permis. Sans clé de service ni adresse IP : pas de limite (développement). */
async function allowed(bucket: Bucket) {
  const key = await requestKey(`auth-${bucket}`);
  if (!key || !process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  const { data, error } = await createServiceClient().rpc("rate_limit_allowed", { p_bucket: bucket, p_client: key, p_max: LIMITS[bucket] });
  return error ? true : data !== false;
}
async function hit(bucket: Bucket) {
  const key = await requestKey(`auth-${bucket}`);
  if (key && process.env.SUPABASE_SERVICE_ROLE_KEY) await createServiceClient().rpc("rate_limit_hit", { p_bucket: bucket, p_client: key });
}

/** Adresse de retour des liens e-mail et de Google, avec la page à rouvrir ensuite. */
async function callback(next: string) {
  return `${await siteOrigin()}/compte/confirmer?next=${encodeURIComponent(safeNextPath(next))}`;
}

function authMessage(code: string | undefined, message: string) {
  const c = `${code ?? ""} ${message}`.toLowerCase();
  if (c.includes("invalid_credentials") || c.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (c.includes("email_not_confirmed") || c.includes("not confirmed")) return "Confirmez d'abord votre adresse e-mail avec le lien reçu.";
  if (c.includes("weak_password") || c.includes("pwned")) return "Mot de passe trop simple : mélangez lettres et chiffres.";
  if (c.includes("same_password")) return "Choisissez un mot de passe différent de l'actuel.";
  if (c.includes("rate_limit") || c.includes("too many")) return "Trop de demandes. Patientez quelques minutes avant de réessayer.";
  if (c.includes("email_address_invalid") || c.includes("invalid email")) return "Adresse e-mail invalide.";
  if (c.includes("signup_disabled")) return "Les inscriptions sont fermées pour le moment.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}

const emailSchema = z.email("Adresse e-mail invalide.").max(200);

// --- Google --------------------------------------------------------------------------------

export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseConfigured) redirect("/compte/connexion?erreur=indisponible");
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: await callback(next) } });
  if (error || !data.url) {
    if (error) logSupabaseError("connexion Google", error);
    redirect(`/compte/connexion?erreur=google&next=${encodeURIComponent(next)}`);
  }
  redirect(data.url);
}

// --- E-mail et mot de passe -----------------------------------------------------------------

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: UNAVAILABLE };
  const email = String(formData.get("email") ?? "").trim();
  const parsed = z.object({ email: emailSchema, password: z.string().min(1, "Mot de passe requis.").max(200) }).safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  if (!(await allowed("login"))) return { error: TOO_MANY, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const unconfirmed = /email_not_confirmed|not confirmed/i.test(`${error.code} ${error.message}`);
    if (!unconfirmed) await hit("login");
    return { error: authMessage(error.code, error.message), unconfirmed, email };
  }
  redirect(safeNextPath(formData.get("next")));
}

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Indiquez votre nom complet.").max(80, "80 caractères maximum."),
  email: emailSchema,
  phone: z.string().max(30),
  password: z.string().min(8, "8 caractères au moins.").max(72, "72 caractères au plus."),
  cgv: z.literal("on", { error: "Acceptez les conditions générales de vente pour continuer." }),
});

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: UNAVAILABLE };
  const raw = Object.fromEntries(["full_name", "email", "phone", "password", "cgv"].map((k) => [k, formData.get(k) ?? ""]));
  const email = String(raw.email).trim();
  const parsed = signupSchema.safeParse({ ...raw, email });
  const fields: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
  const phone = normalizeMlPhone(String(raw.phone));
  if (!phone) fields.phone = phoneError;
  if (Object.keys(fields).length || !parsed.success || !phone) return { error: "Vérifiez les champs signalés.", fields, email };
  if (!(await allowed("signup"))) return { error: TOO_MANY, email };
  await hit("signup");

  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: { emailRedirectTo: await callback(next), data: { full_name: parsed.data.full_name, phone, cgv_accepted: true } },
  });
  if (error) {
    logSupabaseError("inscription client", error, { email: maskEmail(email) });
    return { error: authMessage(error.code, error.message), email };
  }
  // Confirmation désactivée dans Supabase : session ouverte tout de suite
  if (data.session) redirect(next);
  // Même message que le compte existe déjà ou non : ne révèle pas qui est inscrit
  return {
    notice: `Presque fini ! Ouvrez le lien envoyé à ${email} pour confirmer votre adresse (pensez aux courriers indésirables).`,
    unconfirmed: true,
    email,
  };
}

// --- Lien magique, mot de passe oublié, renvoi de la confirmation ---------------------------

export async function sendMagicLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: UNAVAILABLE };
  const email = String(formData.get("email") ?? "").trim();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  if (!(await allowed("email"))) return { error: TOO_MANY, email };
  await hit("email");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: await callback(safeNextPath(formData.get("next"))), shouldCreateUser: true } });
  if (error) {
    logSupabaseError("lien magique", error, { email: maskEmail(email) });
    return { error: authMessage(error.code, error.message), email };
  }
  return { notice: `Lien envoyé à ${email}. Ouvrez-le sur ce téléphone pour vous connecter (valable une heure).`, email };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: UNAVAILABLE };
  const email = String(formData.get("email") ?? "").trim();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };
  if (!(await allowed("email"))) return { error: TOO_MANY, email };
  await hit("email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: await callback("/compte/nouveau-mot-de-passe") });
  if (error) logSupabaseError("mot de passe oublié", error, { email: maskEmail(email) });
  // Toujours le même message : ne révèle pas si l'adresse a un compte
  return { notice: `Si un compte existe pour ${email}, un lien pour choisir un nouveau mot de passe vient d'être envoyé.`, email };
}

export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: UNAVAILABLE };
  const email = String(formData.get("email") ?? "").trim();
  if (!emailSchema.safeParse(email).success) return { error: "Adresse e-mail invalide.", email };
  if (!(await allowed("email"))) return { error: TOO_MANY, email };
  await hit("email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: await callback(safeNextPath(formData.get("next"))) } });
  if (error) logSupabaseError("renvoi de confirmation", error, { email: maskEmail(email) });
  return { notice: `Nouveau lien de confirmation envoyé à ${email}.`, unconfirmed: true, email };
}

// --- Après connexion ----------------------------------------------------------------------------

/** Nouveau mot de passe (après le lien « mot de passe oublié », ou depuis Mon compte). */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "8 caractères au moins.", fields: { password: "8 caractères au moins." } };
  if (password.length > 72) return { error: "72 caractères au plus." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Les deux saisies sont différentes.", fields: { confirm: "Les deux saisies sont différentes." } };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { error: "Le lien a expiré. Demandez-en un nouveau depuis « Mot de passe oublié »." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authMessage(error.code, error.message) };
  redirect("/compte?mot-de-passe=change");
}

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Indiquez votre nom complet.").max(80, "80 caractères maximum."),
  phone: z.string().max(30),
});

/** Profil à compléter (après Google ou un lien magique) : nom, téléphone, CGV. */
export async function completeProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = profileSchema.safeParse({ full_name: formData.get("full_name") ?? "", phone: formData.get("phone") ?? "" });
  const fields: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
  const phone = normalizeMlPhone(String(formData.get("phone") ?? ""));
  if (!phone) fields.phone = phoneError;
  const needsCgv = formData.get("needs_cgv") === "1";
  if (needsCgv && formData.get("cgv") !== "on") fields.cgv = "Acceptez les conditions générales de vente pour continuer.";
  if (Object.keys(fields).length || !parsed.success || !phone) return { error: "Vérifiez les champs signalés.", fields };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/compte/connexion");
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone, ...(needsCgv ? { cgv_accepted_at: new Date().toISOString() } : {}) })
    .eq("id", auth.claims.sub);
  if (error) {
    logSupabaseError("profil client", error);
    return { error: "Vos informations n'ont pas été enregistrées. Réessayez." };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signOutCustomer() {
  if (isSupabaseConfigured) await (await createClient()).auth.signOut();
  redirect("/");
}
