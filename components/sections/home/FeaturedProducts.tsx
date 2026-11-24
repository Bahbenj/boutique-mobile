import { t } from "@/i18n";
import { getFeaturedProducts } from "@/lib/catalog";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconArrowRight } from "@/components/ui/icons";
import { ProductCard } from "@/components/product/ProductCard";

/**
 * Produits mis en avant (`featured`). Mobile : carrousel à défilement
 * horizontal aimanté ; desktop : grille 4 colonnes.
 */
export async function FeaturedProducts({ index }: { index: number }) {
  const products = await getFeaturedProducts(8);
  if (!products.length) return null;

  const seeAll = (
    <Button href="/boutique" variant="dark" icon={<IconArrowRight size={18} className="rtl:rotate-180" />}>
      {t.home.seeAll}
    </Button>
  );

  return (
    <section aria-labelledby="selection-title" className="pb-20 sm:pb-28">
      <Container>
        <Reveal>
          <SectionHeading
            id="selection-title"
            index={index}
            kicker={t.home.featuredKicker}
            title={t.home.featuredTitle}
            action={<div className="hidden sm:block">{seeAll}</div>}
          />
        </Reveal>
      </Container>

      {/* Le carrousel déborde du Container sur mobile pour laisser voir la carte suivante */}
      <Container className="max-sm:px-0">
        <ul className="no-scrollbar mt-10 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-x-4 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {products.map((p, i) => (
            <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <Reveal delay={(i % 4) * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="mt-8 sm:hidden">{seeAll}</Container>
    </section>
  );
}
