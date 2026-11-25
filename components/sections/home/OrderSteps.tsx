import { buildOrderSteps } from "@/data/home";
import { t } from "@/i18n";
import { getCheckoutSettings } from "@/lib/storefront";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconArrowRight, IconWhatsApp } from "@/components/ui/icons";

/** Bloc sombre « comment commander » : rassure sur le paiement à la livraison. */
export async function OrderSteps({ index }: { index: number }) {
  const orderSteps = buildOrderSteps((await getCheckoutSettings()).payments);
  return (
    <section aria-labelledby="commander-title" className="px-3 sm:px-4">
      <div className="mx-auto max-w-[90rem] relative overflow-hidden rounded-card-lg bg-surface py-16 text-fg ring-1 ring-fg/8 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading id="commander-title" index={index} tone="dark" kicker={t.home.stepsKicker} title={t.home.stepsTitle} />
          </Reveal>

          <ol className="mt-12 grid gap-10 sm:mt-16 md:grid-cols-3 md:gap-6">
            {orderSteps.map((step, i) => (
              <li key={step.title}>
                <Reveal delay={i * 0.08} className="border-t border-fg/15 pt-6">
                  <span className="text-sm font-bold text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{step.title}</h3>
                  <p className="mt-3 max-w-sm leading-relaxed text-muted">{step.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-wrap gap-3 sm:mt-16">
            <Button href="/boutique" size="lg" icon={<IconArrowRight size={18} className="rtl:rotate-180" />}>
              {t.hero.primary}
            </Button>
            <Button href={whatsappLink(t.whatsapp.greeting)} size="lg" variant="outline" className="text-fg">
              <IconWhatsApp size={20} />
              {t.hero.secondary}
            </Button>
          </div>
        </Container>
      </div>
    </section>
  );
}
