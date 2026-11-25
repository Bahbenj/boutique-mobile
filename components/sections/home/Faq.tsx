import { buildFaqs } from "@/data/home";
import { t } from "@/i18n";
import { getCheckoutSettings } from "@/lib/storefront";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconPlus, IconWhatsApp } from "@/components/ui/icons";

/**
 * FAQ en <details> natifs : accessibles, sans JS, contenu indexable.
 * Livraison et paiement suivent les réglages de l'admin (repli : config/site.ts).
 */
export async function Faq({ index }: { index: number }) {
  const faqs = buildFaqs(await getCheckoutSettings());
  return (
    <section aria-labelledby="faq-title" className="pb-20 sm:pb-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq-title" index={index} kicker={t.home.faqKicker} title={t.home.faqTitle} />
          <p className="mt-6 text-muted">{t.home.faqMore}</p>
          <Button href={whatsappLink(t.whatsapp.greeting)} variant="whatsapp" className="mt-3">
            <IconWhatsApp size={18} />
            WhatsApp
          </Button>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} name="faq" className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-5 text-lg font-bold tracking-tight [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{f.q}</span>
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-surface shadow-soft transition-[transform,background-color] duration-300 ease-out-expo group-open:rotate-45 group-open:bg-accent"
                  >
                    <IconPlus size={16} />
                  </span>
                </summary>
                <p className="max-w-2xl pe-12 pb-6 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
