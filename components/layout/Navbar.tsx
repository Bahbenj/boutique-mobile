"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { cartCount, useCart } from "@/lib/cart-store";
import { useUI } from "@/lib/ui-store";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { IconBag, IconClose, IconMenu, IconUser } from "@/components/ui/icons";
import { Logo } from "./Logo";
import { navLinks } from "./nav-links";

/** Navbar pilule flottante, fixe, fond clair translucide flouté. */
export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const openAuth = useUI((s) => s.openAuth);
  const openCart = useUI((s) => s.openCart);
  const count = cartCount(useCart((s) => s.items));
  const mounted = useMounted();

  // Ferme le menu mobile à chaque navigation
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) => !href.includes("#") && pathname.startsWith(href);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:pt-4">
      <nav
        aria-label="Navigation principale"
        className={cn(
          "pointer-events-auto mx-auto max-w-5xl rounded-[1.75rem] bg-white/75 shadow-pill ring-1 ring-ink/5",
          "backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-white",
        )}
      >
        <div className="flex h-14 items-center gap-2 ps-4 pe-2 sm:h-16 sm:ps-5">
          <Logo className="me-auto" />

          {/* Liens desktop */}
          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink",
                    isActive(l.href) && "bg-ink/5 text-ink",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ms-auto flex items-center gap-1 lg:ms-3">
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink sm:flex"
            >
              <IconUser size={18} />
              {t.nav.account}
            </button>

            <button
              type="button"
              onClick={openCart}
              className="relative grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/5"
              aria-label={`${t.nav.cart}${mounted && count ? `, ${count} article${count > 1 ? "s" : ""}` : ""}`}
            >
              <IconBag size={20} />
              {mounted && count > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-bold tabular-nums text-accent-ink ring-2 ring-white">
                  {count}
                </span>
              )}
            </button>

            <div className="hidden sm:block">
              <Link href="/boutique" className={buttonClasses("primary", "sm", "h-10 px-5")}>
                {t.nav.cta}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? t.nav.close : t.nav.menu}
              className="grid size-10 place-items-center rounded-full bg-ink text-cream lg:hidden"
            >
              {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
            </button>
          </div>
        </div>

        {/* Menu mobile : la pilule s'agrandit vers le bas */}
        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden lg:hidden"
            >
              <ul className="space-y-1 px-3 pb-2">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-between rounded-2xl px-3 py-3 text-lg font-bold tracking-tight text-ink hover:bg-ink/5"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-2 border-t border-ink/8 p-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    openAuth("login");
                  }}
                  className={buttonClasses("light", "md", "ring-1 ring-ink/10")}
                >
                  <IconUser size={18} />
                  {t.nav.account}
                </button>
                <Link href="/boutique" className={buttonClasses("primary", "md")}>
                  {t.nav.cta}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
