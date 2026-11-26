"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { IconExternal, IconMenu } from "@/components/ui/icons";
import { navFor, type NavRole } from "./nav";

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

/**
 * Navigation admin. Desktop (≥ 1024 px) : barre latérale fixe.
 * Mobile : barre d'onglets en bas, pouces à portée : sections principales
 * (`primary` dans nav.ts) + « Plus » pour les autres, lisible dès 360 px.
 */
export function AdminNav({ account, role = null }: { account: ReactNode; role?: NavRole | null }) {
  // usePathname lit l'URL de la requête : sous <Suspense> (Cache Components) ;
  // le repli est le même menu, sans onglet surligné.
  return (
    <Suspense fallback={<NavView pathname="" account={account} role={role} />}>
      <CurrentNav account={account} role={role} />
    </Suspense>
  );
}

function CurrentNav({ account, role }: { account: ReactNode; role: NavRole | null }) {
  return <NavView pathname={usePathname()} account={account} role={role} />;
}

function NavView({ pathname, account, role }: { pathname: string; account: ReactNode; role: NavRole | null }) {
  const items = navFor(role);
  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-e border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2 font-extrabold tracking-tight">
          <span aria-hidden="true" className="hex grid h-9 w-8 place-items-center bg-gradient-to-b from-gold-hover to-gold text-on-gold text-[0.7rem]">
            {siteConfig.shortName}
          </span>
          <span className="leading-tight">
            {siteConfig.name}
            <span className="block text-xs font-semibold text-muted">Administration</span>
          </span>
        </Link>
        <nav aria-label="Administration" className="mt-8 flex-1">
          <ul className="space-y-1">
            {items.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold transition-colors",
                      active ? "bg-accent text-on-accent" : "text-fg/70 hover:bg-fg/5 hover:text-fg",
                    )}
                  >
                    <Icon size={19} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="space-y-1 border-t border-line pt-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center gap-3 rounded-full px-4 text-sm font-medium text-fg/70 hover:bg-fg/5 hover:text-fg"
          >
            <IconExternal size={17} />
            Voir le site
          </a>
          {account}
        </div>
      </aside>

      {/* Mobile : onglets principaux en bas + menu « Plus » pour le reste */}
      <MobileTabs pathname={pathname} items={items} />
    </>
  );
}

const tab = "flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold tracking-[-0.02em] transition-colors";

function MobileTabs({ pathname, items }: { pathname: string; items: ReturnType<typeof navFor> }) {
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const panel = useRef<HTMLDivElement>(null);
  const primary = items.filter((i) => i.primary);
  const more = items.filter((i) => !i.primary);
  const moreActive = more.some((i) => isActive(pathname, i.href));

  // Fermeture à chaque navigation, sur Échap et au clic en dehors
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <nav
      aria-label="Administration"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div ref={panel}>
        {open && (
          <ul id="admin-more" className="absolute inset-x-3 bottom-full mb-2 space-y-1 rounded-card bg-raised p-2 shadow-lift ring-1 ring-fg/10">
            {more.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-2xl px-4 font-semibold",
                      active ? "bg-accent text-on-accent" : "text-fg hover:bg-fg/5",
                    )}
                  >
                    <Icon size={19} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + (more.length ? 1 : 0)}, minmax(0, 1fr))` }}>
          {primary.map(({ href, short, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="min-w-0">
                <Link href={href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-fg" : "text-fg/60")}>
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent-soft")}>
                    <Icon size={20} />
                  </span>
                  <span className="max-w-full truncate">{short}</span>
                </Link>
              </li>
            );
          })}
          {more.length > 0 && (
            <li className="min-w-0">
              <button
                type="button"
                aria-expanded={open}
                aria-controls="admin-more"
                onClick={() => setOpen((o) => !o)}
                className={cn(tab, open || moreActive ? "text-fg" : "text-fg/60")}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", (open || moreActive) && "bg-accent-soft")}>
                  <IconMenu size={20} />
                </span>
                Plus
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
