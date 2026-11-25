import Image from "next/image";
import type { ComponentType } from "react";
import { siteConfig } from "@/config/site";
import { afterSalesPoints, repairImage, repairServices, services, type ServiceIcon } from "@/data/home";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  IconCheck,
  IconHeadset,
  IconPhone,
  IconRefresh,
  IconShield,
  IconSmartphone,
  IconTransfer,
  IconTruck,
  IconUnlock,
  IconWhatsApp,
  IconWrench,
} from "@/components/ui/icons";

const icons: Record<ServiceIcon, ComponentType<{ size?: number }>> = {
  repair: IconWrench,
  unlock: IconUnlock,
  transfer: IconTransfer,
  screen: IconSmartphone,
  tradein: IconRefresh,
  delivery: IconTruck,
  warranty: IconShield,
};

/**
 * « Nos services » (ancre #services de la navbar) : encadré service après-vente
 * mis en avant, grille des services, tarifs atelier. Masqué si features.services = false.
 */
export function Services({ index }: { index: number }) {
  if (!siteConfig.features.services) return null;

  return (
    <section id="services" aria-labelledby="services-title" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="services-title" index={index} kicker={t.home.servicesKicker} title={t.home.servicesTitle} lead={t.home.servicesLead} />
        </Reveal>

        {/* Point fort : le service après-vente */}
        <Reveal delay={0.06} className="mt-10">
          <div className="grid overflow-hidden rounded-card-lg bg-surface shadow-soft ring-1 ring-gold/30 lg:grid-cols-[1.15fr_1fr]">
            <div className="p-6 sm:p-10">
              <Badge tone="gold">
                <IconHeadset size={14} />
                {t.home.afterSalesKicker}
              </Badge>
              <h3 className="mt-4 text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
                {t.home.afterSalesTitle.replace(/\.$/, "")}
                <span className="text-gold">.</span>
              </h3>
              <p className="mt-4 max-w-lg leading-relaxed text-muted">{t.home.afterSalesText}</p>
              <ul className="mt-6 space-y-3">
                {afterSalesPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-text">
                      <IconCheck size={14} strokeWidth={2.5} />
                    </span>
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={whatsappLink(t.home.repairWhatsapp)} variant="whatsapp" size="lg">
                  <IconWhatsApp size={20} />
                  {t.home.repairQuote}
                </Button>
                <Button href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} variant="outline" size="lg">
                  <IconPhone size={18} />
                  {t.home.call}
                </Button>
              </div>
            </div>
            <div className="relative min-h-[18rem] bg-raised">
              <Image src={repairImage.src} alt={repairImage.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" quality={75} className="object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-surface lg:via-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2 sm:inset-x-6 sm:bottom-6">
                <Badge tone="glass">{t.home.since(siteConfig.since)}</Badge>
                <Badge tone="glass">Diagnostic gratuit</Badge>
                <Badge tone="glass">Pièces testées</Badge>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Services + tarifs atelier */}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {services.map((s, i) => {
            const Icon = icons[s.icon];
            return (
              <li key={s.title}>
                <Reveal delay={(i % 4) * 0.05} className="h-full">
                  <div className="h-full rounded-card bg-surface p-6 shadow-soft">
                    <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/25">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-5 text-lg font-extrabold tracking-tight">{s.title}</h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
          <li>
            <Reveal delay={0.15} className="h-full">
              <div className="h-full rounded-card bg-raised p-6 ring-1 ring-fg/8">
                <h3 className="text-lg font-extrabold tracking-tight">{t.home.repairPricesTitle}</h3>
                <ul className="mt-3 divide-y divide-line">
                  {repairServices.map((r) => (
                    <li key={r.name} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                      <span className="font-medium">{r.name}</span>
                      <span className="whitespace-nowrap text-muted">
                        {t.home.repairFrom} <span className="font-bold text-fg tabular-nums">{formatPrice(r.from)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </li>
        </ul>
      </Container>
    </section>
  );
}
