import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-path";

/**
 * Première barrière, avant chaque page concernée (Next.js 16 : remplace middleware.ts).
 * Rafraîchit la session Supabase, puis :
 *  - /admin : membres de l'équipe seulement (table public.admins, via is_staff).
 *    Un compte client connecté n'y entre jamais. Pages et Server Actions
 *    revérifient elles-mêmes (lib/auth.ts).
 *  - /commande et l'espace /compte : client connecté, sinon page de connexion
 *    avec retour automatique (panier gardé dans le navigateur).
 *  - pages de connexion / inscription : déjà connecté → Mon compte.
 */
const PUBLIC_ACCOUNT_PAGES = /^\/compte\/(connexion|inscription|mot-de-passe-oublie|confirmer)(\/|$)/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login";
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return isAdmin ? noindex(response) : response; // site sans base : rien à protéger côté client

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  // « Pas de session » est normal (visiteur non connecté) ; le reste est un vrai problème
  if (error && error.name !== "AuthSessionMissingError") {
    console.error("[supabase] proxy : session illisible", { name: error.name, status: error.status, code: error.code, message: error.message });
  }
  const signedIn = Boolean(data?.claims?.sub);

  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return isAdmin ? noindex(res) : res;
  };

  // --- Administration : l'équipe seulement --------------------------------------------------
  if (isAdmin) {
    let isStaff = false;
    if (signedIn) {
      // is_staff (migration 20) ; repli sur is_admin pour une base plus ancienne
      const staff = await supabase.rpc("is_staff");
      const ok = staff.error ? (await supabase.rpc("is_admin")).data : staff.data;
      isStaff = ok === true;
    }
    if (!isStaff && !isLogin) {
      const next = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
      return redirectTo(`/admin/login${next}`);
    }
    if (isStaff && isLogin) return redirectTo("/admin");
    return noindex(response);
  }

  // --- Comptes clients ---------------------------------------------------------------------------
  const isAccountAuthPage = PUBLIC_ACCOUNT_PAGES.test(pathname);
  if (isAccountAuthPage) {
    if (signedIn && /^\/compte\/(connexion|inscription)/.test(pathname)) {
      return redirectTo(safeNextPath(request.nextUrl.searchParams.get("next"), "/compte"));
    }
    return response;
  }
  if (!signedIn) {
    return redirectTo(`/compte/connexion?next=${encodeURIComponent(safeNextPath(pathname + search, "/compte"))}`);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** L'admin ne doit jamais être indexé. */
function noindex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/commande", "/compte", "/compte/:path*"],
};
