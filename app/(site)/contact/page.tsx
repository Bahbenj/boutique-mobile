import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteConfig, storeAddress, telHref } from "@/config/site";
import { t } from "@/i18n";
import { reviewRequestMessage } from "@/data/home";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { HexIcon } from "@/components/ui/Hex";
import { IconClock, IconFacebook, IconInstagram, IconMail, IconPhone, IconPin, IconTiktok, IconWhatsApp } from "@/components/ui/icons";
import { getStoreInfo } from "@/lib/storefront";
import { directionsOf, mapEmbedOf, storeAddressOf, tiktokHandleOf } from "@/lib/store-info";

export const metadata: Metadata = {
  title: t.contact.title,
  description: `Contactez ${siteConfig.name} à ${storeAddress} : téléphone, WhatsApp, e-mail, horaires et plan d'accès.`,
  alternates: { canonical: "/contact" },
};

/** Page Contact : coordonnées, horaires, réseaux et carte Google Maps du magasin. */
export default async function ContactPage() {
  const store = await getStoreInfo();
  const { phones, email, hours, social } = store;

  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <h1 className="text-[clamp(2.75rem,10vw,5rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
        {t.contact.title}
        <span className="text-gold">.</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted sm:text-lg">{t.contact.lead}</p>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <div className="rounded-card bg-surface p-6 shadow-soft sm:p-8">
            <dl className="space-y-6">
              <Item icon={<IconPhone size={20} />} label={t.contact.phones}>
                <ul className="space-y-1">
                  {phones.map((p) => (
                    <li key={p}>
                      <a href={telHref(p)} className="font-semibold tabular-nums hover:text-accent hover:underline">
                        {p}
                      </a>
                    </li>
                  ))}
                </ul>
              </Item>
              {email && (
                <Item icon={<IconMail size={20} />} label={t.contact.email}>
                  <a href={`mailto:${email}`} className="font-semibold break-all hover:text-accent hover:underline">
                    {email}
                  </a>
                </Item>
              )}
              <Item icon={<IconPin size={20} />} label={t.contact.address}>
                <span className="font-semibold">{storeAddressOf(store)}, Mali</span>
              </Item>
              <Item icon={<IconClock size={20} />} label={t.contact.hours}>
                <ul className="space-y-1">
                  {hours.map((h) => (
                    <li key={h.days}>
                      <span className="font-semibold">{h.days}</span>
                      <span className="text-muted"> · {h.time}</span>
                    </li>
                  ))}
                </ul>
              </Item>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={whatsappLink(t.whatsapp.greeting, store.whatsapp)} variant="whatsapp">
                <IconWhatsApp size={18} />
                WhatsApp
              </Button>
              <Button href={telHref(store.phone)} variant="outline">
                <IconPhone size={18} />
                {t.home.call}
              </Button>
              <Button href={directionsOf(store)} variant="light">
                <IconPin size={18} />
                {t.home.directions}
              </Button>
            </div>
          </div>

          <div className="rounded-card bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-sm font-bold text-muted">{t.contact.social}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {social.facebook && (
                <li>
                  <Button href={social.facebook} variant="light" size="sm">
                    <IconFacebook size={16} />
                    Facebook
                  </Button>
                </li>
              )}
              {social.instagram && (
                <li>
                  <Button href={social.instagram} variant="light" size="sm">
                    <IconInstagram size={16} />
                    Instagram
                  </Button>
                </li>
              )}
              {social.tiktok && (
                <li>
                  <Button href={social.tiktok} variant="light" size="sm">
                    <IconTiktok size={16} />
                    TikTok {tiktokHandleOf(social.tiktok)}
                  </Button>
                </li>
              )}
              <li>
                <Button href={whatsappLink(reviewRequestMessage, store.whatsapp)} variant="light" size="sm">
                  <IconWhatsApp size={16} />
                  {t.home.leaveReview}
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative min-h-[22rem] overflow-hidden rounded-card bg-surface shadow-soft lg:min-h-full">
          <iframe
            src={mapEmbedOf(store)}
            title={t.contact.mapTitle}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-[1.25rem] border-0 bg-raised"
          />
        </div>
      </div>
    </Container>
  );
}

function Item({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="shrink-0">
        <HexIcon>{icon}</HexIcon>
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 pt-2">{children}</dd>
    </div>
  );
}
