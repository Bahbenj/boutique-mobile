import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-path";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour des liens e-mail (confirmation d'inscription, lien magique, mot de
 * passe oublié) et de Google. Deux formats :
 *  - ?token_hash=…&type=… : lien e-mail (modèles Supabase du README), fonctionne
 *    même ouvert sur un autre appareil ;
 *  - ?code=… : retour de Google (PKCE, même navigateur).
 * Puis : profil incomplet (téléphone, CGV) → /compte/completer ; sinon la page
 * demandée, interne au site uniquement (safeNextPath : pas de redirection ouverte).
 */
const OTP_TYPES = new Set<EmailOtpType>(["signup", "magiclink", "recovery", "email", "invite", "email_change"]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/compte/connexion?erreur=${reason}&next=${encodeURIComponent(next)}`, url.origin));

  if (url.searchParams.get("error")) return fail(url.searchParams.get("error") === "access_denied" ? "annule" : "lien");

  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let error: unknown = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type && OTP_TYPES.has(type)) ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  else return fail("lien");
  if (error) return fail("lien");

  // Mot de passe oublié : directement au choix du nouveau mot de passe
  if (type === "recovery") return NextResponse.redirect(new URL("/compte/nouveau-mot-de-passe", url.origin));

  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (uid) {
    const { data: p } = await supabase.from("profiles").select("full_name, phone, cgv_accepted_at").eq("id", uid).maybeSingle();
    if (!p || !p.phone || !p.cgv_accepted_at || (p.full_name ?? "").trim().length < 2) {
      return NextResponse.redirect(new URL(`/compte/completer?next=${encodeURIComponent(next)}`, url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
