import type { Metadata } from "next";
import Image from "next/image";
import { siteConfig, storeAddress, telHref } from "@/config/site";
import { repairImage, repairQuoteMessage, repairSteps, repairVideos } from "@/data/home";
import { t } from "@/i18n";
import { whatsappLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HexDivider, HexIcon, HexPattern } from "@/components/ui/Hex";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconPhone, IconPin, IconPlay, IconTiktok, IconWhatsApp } from "@/components/ui/icons";
import { ServiceGrid } from "@/components/sections/ServiceGrid";

export const metadata: Metadata = {
  title: "Réparation et services",
  description: `Réparation de smartphones à ${storeAddress} : écran, vitre, micro-soudure, flashage, déblocage, transfert de données. Devis sur WhatsApp.`,
  alternates: { canonical: "/reparation" },
};

/** Page Réparation et services : services, parcours en 3 étapes, devis WhatsApp, vidéos. */
export default function RepairPage() {
  const quote = whatsappLink(repairQuoteMessage);

  return (
    <>
      {/* En-tête */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-20">
        <HexPattern className="text-accent/10" />
        <Container className="relative grid items-center gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Badge tone="gold">{t.home.since(siteConfig.since)} · {siteConfig.tagline}</Badge>
            <h1 className="mt-5 text-[clamp(2.4rem,8.5vw,4.75rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
              {/* Espaces insécables avant « ? » et « ! » (typographie française) */}
              {t.repair.title.replace(/ !$/, "").replace(/ ([?:;])/g, " $1")}
              <span className="text-gold">&nbsp;!</span>
            </h1>
            <p className="mt-5 max-w-xl text-muted sm:text-lg">{t.repair.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={quote} variant="whatsapp" size="lg" className="max-sm:w-full max-sm:whitespace-normal max-sm:px-4 max-sm:text-center">
                <IconWhatsApp size={20} />
                {t.home.repairQuote}
              </Button>
              <Button href={telHref(siteConfig.phone)} variant="outline" size="lg">
                <IconPhone size={18} />
                {t.home.call}
              </Button>
            </div>
          </div>
          <div className="hex-soft aspect-hex relative mx-auto w-full max-w-[20rem] bg-raised lg:max-w-[24rem]">
            <Image src={repairImage.src} alt={repairImage.alt} fill preload sizes="(min-width: 1024px) 24rem, 80vw" quality={75} className="object-cover" />
          </div>
        </Container>
      </section>

      <Container>
        <HexDivider />
      </Container>

      {/* Services */}
      <section aria-labelledby="services-title" className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading id="services-title" index={1} kicker={t.home.servicesKicker} title={t.repair.servicesTitle} />
          </Reveal>
          <ServiceGrid className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" />
        </Container>
      </section>

      {/* Parcours en 3 étapes */}
      <section aria-labelledby="etapes-title" className="px-3 sm:px-4">
        <div className="relative mx-auto max-w-[90rem] overflow-hidden rounded-card-lg bg-navy py-16 ring-1 ring-accent/20 sm:py-24">
          <HexPattern />
          <Container className="relative">
            <Reveal>
              <SectionHeading id="etapes-title" index={2} tone="dark" kicker={t.repair.stepsKicker} title={t.repair.stepsTitle} />
            </Reveal>
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
              {repairSteps.map((step, i) => (
                <li key={step.title}>
                  <Reveal delay={i * 0.08} className="flex gap-4 md:block">
                    <HexIcon tone="solid" size="lg">
                      <span className="text-lg font-extrabold tabular-nums">{i + 1}</span>
                    </HexIcon>
                    <div>
                      <h3 className="text-2xl font-extrabold tracking-tight md:mt-5 sm:text-3xl">{step.title}</h3>
                      <p className="mt-2 max-w-sm leading-relaxed text-fg/80">{step.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
            <div className="mt-12">
              <Button href={quote} variant="whatsapp" size="lg" className="max-sm:w-full max-sm:whitespace-normal max-sm:px-4 max-sm:text-center">
                <IconWhatsApp size={20} />
                {t.home.repairQuote}
              </Button>
            </div>
          </Container>
        </div>
      </section>

      {/* Vidéos de réparation (emplacement prêt) */}
      <section aria-labelledby="videos-title" className="py-16 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading id="videos-title" index={3} kicker={t.repair.videosKicker} title={t.repair.videosTitle} />
          </Reveal>
          {repairVideos.length > 0 ? (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {repairVideos.map((v) => (
                <li key={v.src} className="overflow-hidden rounded-card bg-surface shadow-soft">
                  <video src={v.src} poster={v.poster} controls preload="none" playsInline className="aspect-[9/16] w-full bg-raised object-cover" />
                  <p className="p-4 font-semibold">{v.title}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} aria-hidden="true" className={i > 0 ? "hidden sm:block" : undefined}>
                  <div className="relative grid aspect-[9/16] max-h-[26rem] w-full place-items-center overflow-hidden rounded-card bg-surface ring-1 ring-fg/8">
                    <HexPattern className="text-accent/10" />
                    <HexIcon tone="gold" size="lg">
                      <IconPlay size={22} />
                    </HexIcon>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
                <p className="max-w-xl text-muted">{t.repair.videosEmpty}</p>
                <Button href={siteConfig.social.tiktok} variant="light" size="sm">
                  <IconTiktok size={16} />
                  {siteConfig.social.tiktokHandle}
                </Button>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Appel à l'action final */}
      <Container className="pb-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-card-lg bg-surface p-6 shadow-soft ring-1 ring-gold/30 sm:p-10">
          <HexPattern className="text-gold/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-extrabold tracking-tight">{t.repair.ctaTitle}</h2>
              <p className="mt-2 max-w-xl text-muted">{t.repair.ctaText}</p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <IconPin size={16} className="text-accent" />
                {storeAddress}
              </p>
            </div>
            <Button href={quote} variant="whatsapp" size="lg" className="shrink-0 max-sm:w-full max-sm:whitespace-normal max-sm:px-4 max-sm:text-center">
              <IconWhatsApp size={20} />
              {t.home.repairQuote}
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}
