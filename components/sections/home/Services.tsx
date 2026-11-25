import Image from "next/image";
import { siteConfig, telHref } from "@/config/site";
import { afterSalesPoints, repairImage, repairQuoteMessage } from "@/data/home";
import { t } from "@/i18n";
import { whatsappLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HexIcon, HexPattern } from "@/components/ui/Hex";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconArrowRight, IconCheck, IconHeadset, IconPhone, IconWhatsApp } from "@/components/ui/icons";
import { ServiceGrid } from "../ServiceGrid";

/**
 * « Nos services » sur l'accueil (ancre #services) : encadré service
 * après-vente, grille des services, lien vers la page /reparation.
 * Masqué si features.services = false.
 */
export function Services({ index }: { index: number }) {
  if (!siteConfig.features.services) return null;

  return (
    <section id="services" aria-labelledby="services-title" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="services-title"
            index={index}
            kicker={t.home.servicesKicker}
            title={t.home.servicesTitle}
            lead={t.home.servicesLead}
            action={
              <Button href="/reparation" variant="light" icon={<IconArrowRight size={18} className="rtl:rotate-180" />}>
                {t.home.repairMore}
              </Button>
            }
          />
        </Reveal>

        {/* Point fort : le service après-vente */}
        <Reveal delay={0.06} className="mt-10">
          <div className="relative grid items-center gap-8 overflow-hidden rounded-card-lg bg-navy p-6 ring-1 ring-gold/30 sm:p-10 lg:grid-cols-[1.2fr_1fr]">
            <HexPattern />
            <div className="relative">
              <Badge tone="gold">
                <IconHeadset size={14} />
                {t.home.afterSalesKicker}
              </Badge>
              <h3 className="mt-4 text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
                {t.home.afterSalesTitle.replace(/\.$/, "")}
                <span className="text-gold">.</span>
              </h3>
              <p className="mt-4 max-w-lg leading-relaxed text-fg/80">{t.home.afterSalesText}</p>
              <ul className="mt-6 space-y-3">
                {afterSalesPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <HexIcon tone="gold" size="sm" className="mt-0.5">
                      <IconCheck size={12} strokeWidth={2.75} />
                    </HexIcon>
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={whatsappLink(repairQuoteMessage)} variant="whatsapp" size="lg" className="max-sm:w-full max-sm:whitespace-normal max-sm:px-4 max-sm:text-center">
                  <IconWhatsApp size={20} />
                  {t.home.repairQuote}
                </Button>
                <Button href={telHref(siteConfig.phone)} variant="outline" size="lg">
                  <IconPhone size={18} />
                  {t.home.call}
                </Button>
              </div>
            </div>
            {/* Image principale en hexagone (motif de marque) */}
            <div className="hex-soft aspect-hex relative mx-auto w-full max-w-[22rem] bg-raised">
              <Image src={repairImage.src} alt={repairImage.alt} fill sizes="(min-width: 1024px) 22rem, 80vw" quality={75} className="object-cover" />
              <span className="absolute inset-x-0 bottom-[18%] flex justify-center">
                <Badge tone="glass">{t.home.since(siteConfig.since)}</Badge>
              </span>
            </div>
          </div>
        </Reveal>

        <ServiceGrid className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" />
      </Container>
    </section>
  );
}
