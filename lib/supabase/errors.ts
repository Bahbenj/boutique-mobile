import "server-only";

/**
 * Diagnostic des erreurs Supabase côté serveur : classe l'erreur pour
 * l'interface et l'écrit dans le terminal SANS mot de passe ni clé.
 */

export type AuthFailure = "credentials" | "unconfirmed" | "config" | "network" | "rate_limit" | "unknown";

type SupabaseLikeError = {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
  details?: string;
  hint?: string;
};

export function classifyAuthError(error: SupabaseLikeError): AuthFailure {
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (code === "invalid_credentials" || msg.includes("invalid login credentials")) return "credentials";
  if (code === "email_not_confirmed") return "unconfirmed";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error.status === 429) return "rate_limit";
  if (msg.includes("invalid api key") || msg.includes("no api key") || code === "no_authorization" || code === "bad_jwt") return "config";
  if (error.name === "AuthRetryableFetchError" || msg.includes("fetch failed") || msg.includes("enotfound") || error.status === 0) return "network";
  if (error.status === 401 || error.status === 403) return "config";
  return "unknown";
}

/** « brehima@gmail.com » → « b***@gmail.com » : assez pour s'y retrouver, sans exposer l'adresse. */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  return domain ? `${user.slice(0, 1)}***@${domain}` : "***";
}

/** Écrit l'erreur réelle dans le terminal du serveur (jamais de mot de passe ni de clé). */
export function logSupabaseError(context: string, error: SupabaseLikeError, extra: Record<string, string> = {}) {
  console.error(`[supabase] ${context}`, {
    name: error.name,
    status: error.status,
    code: error.code,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(error.hint ? { hint: error.hint } : {}),
    ...extra,
  });
}
