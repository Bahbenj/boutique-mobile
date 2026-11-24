"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { IconExternal } from "@/components/ui/icons";
import { adminNav } from "./nav";

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

/**
 * Navigation admin. Desktop (≥ 1024 px) : barre latérale fixe.
 * Mobile : barre d'onglets en bas, pouces à portée, 5 sections.
 */
export function AdminNav({ account }: { account: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-e border-line bg-white px-4 py-5 lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2 font-extrabold tracking-tight">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-ink text-[0.7rem] text-accent">
            {siteConfig.shortName}
          </span>
          <span className="leading-tight">
            {siteConfig.name}
            <span className="block text-xs font-semibold text-muted">Administration</span>
          </span>
        </Link>
        <nav aria-label="Administration" className="mt-8 flex-1">
          <ul className="space-y-1">
            {adminNav.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-full px-4 text-[0.9375rem] font-semibold transition-colors",
                      active ? "bg-ink text-cream" : "text-ink/70 hover:bg-ink/5 hover:text-ink",
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
            className="flex h-10 items-center gap-3 rounded-full px-4 text-sm font-medium text-ink/70 hover:bg-ink/5 hover:text-ink"
          >
            <IconExternal size={17} />
            Voir le site
          </a>
          {account}
        </div>
      </aside>

      {/* Mobile : onglets en bas */}
      <nav
        aria-label="Administration"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {adminNav.map(({ href, short, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors",
                    active ? "text-ink" : "text-ink/50",
                  )}
                >
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-accent-soft")}>
                    <Icon size={20} />
                  </span>
                  {short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
