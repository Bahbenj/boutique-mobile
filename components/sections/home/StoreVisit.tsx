import { directionsUrl, siteConfig, storeAddress, telHref } from "@/config/site";
import { t } from "@/i18n";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconClock, IconPhone, IconPin, IconWhatsApp } from "@/components/ui/icons";

/** Adresse, horaires et carte du magasin. Tout vient de config/site.ts. */
export function StoreVisit({ index }: { index: number }) {
  const { hours, phones } = siteConfig;

  return (
    <section aria-labelledby="magasin-title" className="pb-20 sm:pb-28">
      <Container>
        <Reveal>
          <Card className="grid lg:grid-cols-[1fr_1.2fr]">
            <div className="p-6 sm:p-10">
              <SectionHeading id="magasin-title" index={index} kicker={t.home.visitKicker} title={t.home.visitTitle} lead={t.home.visitLead} />

              <dl className="mt-8 space-y-5">
                <div className="flex gap-3">
                  <dt className="mt-0.5 text-muted">
                    <IconPin size={20} />
                    <span className="sr-only">Adresse</span>
                  </dt>
                  <dd className="font-semibold">{storeAddress}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="mt-0.5 text-muted">
                    <IconClock size={20} />
                    <span className="sr-only">{t.footer.hours}</span>
                  </dt>
                  <dd>
                    <ul className="space-y-1">
                      {hours.map((h) => (
                        <li key={h.days}>
                          <span className="font-semibold">{h.days}</span>
                          <span className="text-muted"> · {h.time}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="mt-0.5 text-muted">
                    <IconPhone size={20} />
                    <span className="sr-only">Téléphone</span>
                  </dt>
                  <dd className="flex flex-wrap gap-x-4 gap-y-1">
                    {phones.map((p) => (
                      <a key={p} href={telHref(p)} className="font-semibold tabular-nums hover:text-accent hover:underline">
                        {p}
                      </a>
                    ))}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={directionsUrl} variant="dark">
                  <IconPin size={18} />
                  {t.home.directions}
                </Button>
                <Button href={whatsappLink(t.whatsapp.greeting)} variant="whatsapp">
                  <IconWhatsApp size={18} />
                  WhatsApp
                </Button>
              </div>
            </div>

            <div className="relative min-h-80 lg:min-h-full">
              <iframe
                src={siteConfig.mapEmbedUrl}
                title={t.home.mapTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] rounded-[1.25rem] border-0 bg-raised"
              />
            </div>
          </Card>
        </Reveal>
      </Container>
    </section>
  );
}
