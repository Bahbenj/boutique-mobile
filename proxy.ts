import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Protège /admin : rafraîchit la session Supabase et n'autorise que les
 * administrateurs (table public.admins). Les pages et Server Actions
 * revérifient elles-mêmes (lib/auth.ts) : le proxy n'est qu'une première barrière.
 * Next.js 16 : ce fichier remplace middleware.ts.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let isAdmin = false;
  if (url && key) {
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
    if (data?.claims?.sub) {
      // Toute l'équipe (is_staff, migration 20) ; repli sur is_admin pour une base plus ancienne
      const staff = await supabase.rpc("is_staff");
      const ok = staff.error ? (await supabase.rpc("is_admin")).data : staff.data;
      isAdmin = ok === true;
    }
  }

  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return noindex(res);
  };

  if (!isAdmin && !isLogin) {
    const next = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectTo(`/admin/login${next}`);
  }
  if (isAdmin && isLogin) return redirectTo("/admin");

  return noindex(response);
}

/** L'admin ne doit jamais être indexé. */
function noindex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
