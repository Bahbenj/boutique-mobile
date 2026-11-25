import type { ComponentType } from "react";
import { services, type ServiceIcon } from "@/data/home";
import { Reveal } from "@/components/ui/Reveal";
import { HexIcon, HexPattern } from "@/components/ui/Hex";
import { IconBag, IconFlash, IconSliders, IconTransfer, IconUnlock, IconWrench } from "@/components/ui/icons";

const icons: Record<ServiceIcon, ComponentType<{ size?: number }>> = {
  repair: IconWrench,
  flash: IconFlash,
  unlock: IconUnlock,
  transfer: IconTransfer,
  setup: IconSliders,
  shop: IconBag,
};

/** Grille des services (accueil et page Réparation), puces hexagonales. */
export function ServiceGrid({ className }: { className?: string }) {
  return (
    <ul className={className ?? "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"}>
      {services.map((s, i) => {
        const Icon = icons[s.icon];
        return (
          <li key={s.title}>
            <Reveal delay={(i % 3) * 0.05} className="h-full">
              <div className="relative h-full overflow-hidden rounded-card bg-surface p-6 shadow-soft">
                <HexPattern className="text-accent/8" />
                <HexIcon>
                  <Icon size={20} />
                </HexIcon>
                <h3 className="relative mt-5 text-lg font-extrabold tracking-tight">{s.title}</h3>
                <p className="relative mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{s.text}</p>
              </div>
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}
