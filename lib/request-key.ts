import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * Empreinte du visiteur pour les limites anti-robots : SHA-256 de son adresse IP
 * (jamais l'adresse elle-même), propre à chaque usage. null si l'adresse est
 * inconnue (développement local) : pas de limite.
 */
export async function requestKey(scope: string) {
  const h = await headers();
  // x-real-ip d'abord : Vercel le pose lui-même, et les modèles Caddy / Nginx du guide
  // (deploy/) l'écrasent avec l'adresse réelle de la connexion ; x-forwarded-for peut
  // contenir des valeurs envoyées par le navigateur, on ne s'en sert qu'en repli.
  const ip = h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? createHash("sha256").update(`${scope}:${ip}`).digest("hex") : null;
}

/**
 * Adresse du site pour les liens envoyés par e-mail et le retour de Google :
 * NEXT_PUBLIC_SITE_URL si elle est définie (production), sinon l'hôte de la
 * requête. Supabase n'accepte de toute façon que les adresses déclarées dans
 * Authentication → URL Configuration.
 */
export async function siteOrigin() {
  const fixed = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fixed) return fixed;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
