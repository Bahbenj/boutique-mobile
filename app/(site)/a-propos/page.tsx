import type { Metadata } from "next";
import Image from "next/image";
import { directionsUrl, siteConfig, storeAddress, telHref } from "@/config/site";
import { afterSalesPoints, repairImage, services } from "@/data/home";
import { t } from "@/i18n";
import { whatsappLink } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { IconCheck, IconClock, IconHeadset, IconPhone, IconPin, IconWhatsApp } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "À propos",
  description: `${siteConfig.name}, boutique de smartphones et d'accessoires à ${storeAddress} depuis ${siteConfig.since}. ${siteConfig.slogan}`,
  alternates: { canonical: "/a-propos" },
};

/**
 * Page « À propos » : histoire, service après-vente, équipe, localisation.
 * TODO client : compléter l'histoire et présenter l'équipe (prénoms, photo du
 * magasin dans /public/images) ; les textes ci-dessous ne reprennent que les
 * informations du questionnaire.
 */
export default function AboutPage() {
  const { name, since, slogan, hours, address } = siteConfig;

  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <Badge tone="gold">{t.home.since(since)}</Badge>
      <h1 className="mt-4 max-w-4xl text-[clamp(2.5rem,8vw,4.75rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
        {slogan.replace(/\.$/, "")}
        <span className="text-gold">.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-muted sm:text-lg">
        {name} vend et entretient des smartphones à {address.district}, à {address.city}, depuis {since}. Tecno, Samsung, Apple, neufs
        ou d&apos;occasion, et tous les accessoires qui vont avec.
      </p>

      {/* Histoire */}
      <section aria-labelledby="histoire-title" className="mt-14 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-card bg-surface p-6 shadow-soft sm:p-10">
          <h2 id="histoire-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Notre histoire
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-muted">
            <p>
              {name} a ouvert ses portes en {since} à {address.district}. Depuis, nous aidons nos clients à choisir le bon téléphone, au bon prix, et nous restons là après l&apos;achat.
            </p>
            <p>
              Notre conviction tient en une phrase : <span className="font-semibold text-gold-text">{slogan.toLowerCase()}</span> Un
              téléphone est un outil de tous les jours ; quand il tombe en panne, il faut une réponse rapide et une personne de
              confiance.
            </p>
            <p>Nous vendons au détail, aux particuliers, en magasin comme en ligne, avec une livraison dans tout le Mali.</p>
          </div>
        </div>
        <div className="relative min-h-[18rem] overflow-hidden rounded-card bg-raised">
          <Image src={repairImage.src} alt={repairImage.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" quality={75} className="object-cover" />
        </div>
      </section>

      {/* Service après-vente */}
      <section aria-labelledby="sav-title" className="mt-4 rounded-card bg-surface p-6 shadow-soft ring-1 ring-gold/30 sm:p-10">
        <Badge tone="gold">
          <IconHeadset size={14} />
          {t.home.afterSalesKicker}
        </Badge>
        <h2 id="sav-title" className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t.home.afterSalesTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t.home.afterSalesText}</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {afterSalesPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 rounded-2xl bg-raised p-4">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-gold-soft text-gold-text">
                <IconCheck size={14} strokeWidth={2.5} />
              </span>
              <span className="font-medium">{point}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Nos services : {services.map((s) => s.title.toLowerCase()).join(", ")}.
        </p>
      </section>

      {/* Équipe + localisation */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="equipe-title" className="rounded-card bg-surface p-6 shadow-soft sm:p-10">
          <h2 id="equipe-title" className="text-2xl font-extrabold tracking-tight">
            L&apos;équipe
          </h2>
          <p className="mt-3 leading-relaxed text-muted">
            Au magasin, vous êtes accueilli par des vendeurs qui connaissent chaque modèle et par des techniciens qui réparent sur
            place. Ce sont les mêmes personnes qui vous répondent sur WhatsApp et qui suivent votre téléphone après l&apos;achat.
          </p>
        </section>

        <section aria-labelledby="magasin-title" className="rounded-card bg-surface p-6 shadow-soft sm:p-10">
          <h2 id="magasin-title" className="text-2xl font-extrabold tracking-tight">
            Nous trouver
          </h2>
          <ul className="mt-4 space-y-3">
            <li className="flex gap-3">
              <IconPin size={20} className="mt-0.5 shrink-0 text-accent" />
              <span className="font-semibold">{storeAddress}, Mali</span>
            </li>
            {hours.map((h) => (
              <li key={h.days} className="flex gap-3">
                <IconClock size={20} className="mt-0.5 shrink-0 text-accent" />
                <span>
                  <span className="font-semibold">{h.days}</span>
                  <span className="text-muted"> · {h.time}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={whatsappLink(t.whatsapp.greeting)} variant="whatsapp">
              <IconWhatsApp size={18} />
              WhatsApp
            </Button>
            <Button href={telHref(siteConfig.phone)} variant="outline">
              <IconPhone size={18} />
              {t.home.call}
            </Button>
            <Button href={directionsUrl} variant="light">
              <IconPin size={18} />
              {t.home.directions}
            </Button>
            <Button href="/contact" variant="light">
              {t.home.contactUs}
            </Button>
          </div>
        </section>
      </div>
    </Container>
  );
}
