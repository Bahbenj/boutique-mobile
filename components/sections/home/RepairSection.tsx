import Image from "next/image";
import { siteConfig } from "@/config/site";
import { repairImage, repairServices } from "@/data/home";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconClock, IconPhone, IconWhatsApp } from "@/components/ui/icons";

/** Atelier réparation (ancre #reparation de la navbar). Masqué si features.repair = false. */
export function RepairSection({ index }: { index: number }) {
  if (!siteConfig.features.repair) return null;

  return (
    <section id="reparation" aria-labelledby="reparation-title" className="py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeading
              id="reparation-title"
              index={index}
              kicker={t.home.repairKicker}
              title={t.home.repairTitle}
              lead={t.home.repairLead}
            />
          </Reveal>

          <Reveal delay={0.08}>
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {repairServices.map((s) => (
                <li key={s.name} className="flex items-baseline gap-3 py-4">
                  <span className="font-semibold">{s.name}</span>
                  <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
                    <IconClock size={14} className="translate-y-px" />
                    {s.delay}
                  </span>
                  <span className="ms-auto text-sm whitespace-nowrap text-muted">
                    {t.home.repairFrom} <span className="text-base font-bold text-ink tabular-nums">{formatPrice(s.from)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

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

        <Reveal delay={0.1} className="relative min-h-[22rem] overflow-hidden rounded-card-lg bg-ink lg:min-h-0">
          <Image src={repairImage.src} alt={repairImage.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" quality={75} className="object-cover" />
          <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2 sm:inset-x-6 sm:bottom-6">
            <Badge tone="glass">Garantie 3 mois</Badge>
            <Badge tone="glass">Devis gratuit</Badge>
            <Badge tone="glass">Pièces testées</Badge>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
