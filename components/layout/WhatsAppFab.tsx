"use client";

import { t } from "@/i18n";
import { useUI } from "@/lib/ui-store";
import { whatsappLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { IconWhatsApp } from "@/components/ui/icons";

/** Bouton WhatsApp flottant, sur tout le site (s'efface pendant le hero épinglé). */
export function WhatsAppFab() {
  const hidden = useUI((s) => s.heroActive);
  return (
    <a
      href={whatsappLink(t.whatsapp.greeting)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.whatsapp.fab}
      tabIndex={hidden ? -1 : undefined}
      className={cn(
        "fixed end-4 bottom-4 z-40 flex h-14 items-center gap-2 rounded-full bg-whatsapp px-4 text-[#0b3d1f] shadow-lift sm:end-6 sm:bottom-6",
        "transition-[transform,opacity] duration-300 ease-out-expo hover:scale-105 active:scale-95",
        hidden && "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <IconWhatsApp size={26} />
      <span className="hidden text-sm font-bold lg:inline">WhatsApp</span>
    </a>
  );
}
