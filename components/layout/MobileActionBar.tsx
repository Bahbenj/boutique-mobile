"use client";

import { telHref } from "@/config/site";
import { t } from "@/i18n";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { IconBag, IconPhone, IconWhatsApp } from "@/components/ui/icons";
import { CartBadge, useCartLabel } from "@/components/cart/CartBadge";
import { useStoreInfo, useWhatsappLink } from "@/components/layout/StoreInfoProvider";

const item =
  "flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-semibold " +
  "transition-[background-color,transform] duration-200 active:scale-[0.96]";

/**
 * Barre d'actions fixe en bas d'écran (< 768 px) : Appeler, WhatsApp, Panier.
 * Remplace le bouton WhatsApp flottant sur mobile et s'efface pendant le hero.
 */
export function MobileActionBar() {
  const waLink = useWhatsappLink();
  const store = useStoreInfo();

  const hidden = useUI((s) => s.heroActive);
  const openCart = useUI((s) => s.openCart);
  const cartLabel = useCartLabel(t.actionBar.cart);
  const tab = hidden ? -1 : undefined;

  return (
    <nav
      aria-label={t.actionBar.label}
      aria-hidden={hidden || undefined}
      className={cn(
        "fixed inset-x-3 z-40 md:hidden",
        "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
        "transition-[transform,opacity] duration-300 ease-out-expo",
        hidden && "pointer-events-none translate-y-[150%] opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-md gap-1.5 rounded-full bg-surface/85 p-1.5 shadow-pill ring-1 ring-fg/5 backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-surface">
        <a href={telHref(store.phone)} tabIndex={tab} className={cn(item, "text-fg hover:bg-fg/5")}>
          <IconPhone size={18} />
          {t.actionBar.call}
        </a>
        <a
          href={waLink(t.whatsapp.greeting)}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tab}
          className={cn(item, "bg-whatsapp text-[#0b3d1f] hover:brightness-95")}
        >
          <IconWhatsApp size={20} />
          {t.actionBar.whatsapp}
        </a>
        <button type="button" onClick={openCart} tabIndex={tab} aria-label={cartLabel} className={cn(item, "bg-accent text-on-accent hover:bg-accent-hover")}>
          <span className="relative">
            <IconBag size={19} />
            <CartBadge className="absolute -end-2.5 -top-2 ring-2 ring-fg" />
          </span>
          {t.actionBar.cart}
        </button>
      </div>
    </nav>
  );
}
