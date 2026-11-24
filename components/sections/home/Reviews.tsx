import { reviews } from "@/data/home";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconStar } from "@/components/ui/icons";

/** Avis clients. Masqué si data/home.ts → reviews est vide. */
export function Reviews({ index }: { index: number }) {
  if (!reviews.length) return null;

  return (
    <section aria-labelledby="avis-title" className="pb-20 sm:pb-28">
      <Container>
        <Reveal>
          <SectionHeading id="avis-title" index={index} kicker={t.home.reviewsKicker} title={t.home.reviewsTitle} />
        </Reveal>
      </Container>

      <Container className="max-sm:px-0">
        <ul className="no-scrollbar mt-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {reviews.map((r, i) => (
            <li key={r.name} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <Reveal delay={i * 0.06} className="h-full">
                <figure className="flex h-full flex-col rounded-card bg-white p-6 shadow-soft">
                  <p className="flex gap-0.5 text-accent" aria-label={`Note : ${r.rating} sur 5`}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <IconStar key={s} size={16} filled={s < r.rating} />
                    ))}
                  </p>
                  <blockquote className="mt-4 flex-1 leading-relaxed">« {r.text} »</blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="font-bold">{r.name}</span>
                    <span className="text-muted"> · {r.city}</span>
                    {r.product && <span className="mt-0.5 block text-muted">{r.product}</span>}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
