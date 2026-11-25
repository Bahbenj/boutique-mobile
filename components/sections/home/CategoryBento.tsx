import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { repairImage } from "@/data/home";
import { t } from "@/i18n";
import { getCategories } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconArrowUpRight } from "@/components/ui/icons";

type Tile = {
  href: string;
  title: string;
  text: string;
  badge: string;
  image: string;
  alt: string;
  size: "hero" | "wide" | "small";
};

/** Placement dans la grille (2 colonnes mobile, 4 desktop) selon la taille de tuile. */
const layouts: Record<Tile["size"], { layout: string; sizes: string }> = {
  hero: { layout: "col-span-2 aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:row-span-2", sizes: "(min-width: 1024px) 50vw, 100vw" },
  wide: { layout: "col-span-2 aspect-[16/10] lg:aspect-auto", sizes: "(min-width: 1024px) 50vw, 100vw" },
  small: { layout: "aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto", sizes: "(min-width: 1024px) 25vw, 50vw" },
};

/**
 * Grille bento des rayons : le 1er en grand, le 2e en large, les suivants en
 * petit, puis la tuile « Nos services ». S'adapte au nombre de catégories.
 */
export async function CategoryBento({ index }: { index: number }) {
  const categories = (await getCategories()).filter((c) => c.count > 0);
  const withServices = siteConfig.features.services;

  const tiles: Tile[] = categories.map((c, i) => ({
    href: `/boutique/${c.slug}`,
    title: c.label,
    text: c.description,
    badge: t.home.models(c.count),
    image: c.image,
    alt: c.alt,
    size: i === 0 ? "hero" : i === 1 ? "wide" : "small",
  }));
  if (withServices) {
    tiles.push({
      href: "/reparation",
      title: t.home.servicesCardTitle,
      text: t.home.servicesCardText,
      badge: t.home.afterSalesKicker,
      image: repairImage.src,
      alt: repairImage.alt,
      size: "wide",
    });
  }
  // Nombre impair de petites tuiles : la dernière prend toute la ligne (pas de trou sur mobile)
  const smallCount = tiles.filter((x) => x.size === "small").length;
  if (smallCount % 2 === 1) tiles.findLast((x) => x.size === "small")!.size = "wide";

  return (
    <section aria-labelledby="rayons-title" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="rayons-title" index={index} kicker={t.home.categoriesKicker} title={t.home.categoriesTitle} />
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[16rem] lg:grid-cols-4">
          {tiles.map((tile, i) => {
            const { layout, sizes } = layouts[tile.size];
            const small = tile.size === "small";
            return (
              <Reveal key={tile.href} delay={(i % 4) * 0.06} className={cn("min-h-0", layout)}>
                <Link
                  href={tile.href}
                  className="group relative flex h-full flex-col justify-end overflow-hidden rounded-card bg-gradient-to-b from-navy to-canvas p-4 text-white ring-1 ring-white/8 transition-shadow duration-300 hover:shadow-lift sm:p-6"
                >
                  <Image
                    src={tile.image}
                    alt={tile.alt}
                    fill
                    sizes={sizes}
                    quality={75}
                    className={cn(
                      "transition-transform duration-1000 ease-out-expo group-hover:scale-105",
                      // Visuel provisoire (SVG portrait) : calé à droite plutôt que recadré sous le titre
                      tile.image.endsWith(".svg") ? "object-contain object-right-top" : "object-cover",
                    )}
                  />
                  {/* Voiles : bas pour le titre, haut pour le badge sur photo claire */}
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/0" />
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/40 to-black/0" />
                  <Badge tone="glass" className="absolute start-4 top-4 sm:start-6 sm:top-6">
                    {tile.badge}
                  </Badge>
                  <span
                    aria-hidden="true"
                    className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-canvas transition-[background-color,transform] duration-300 ease-out-expo group-hover:rotate-45 group-hover:bg-accent sm:end-6 sm:top-6 rtl:-scale-x-100"
                  >
                    <IconArrowUpRight size={18} />
                  </span>
                  <span className="relative">
                    <span
                      className={cn(
                        "block leading-[1.02] font-extrabold tracking-[-0.035em]",
                        small ? "text-[clamp(1.125rem,5vw,1.5rem)] lg:text-[1.5rem]" : "text-[clamp(1.75rem,5vw,3rem)]",
                      )}
                    >
                      {tile.title}
                      <span className="text-gold">.</span>
                    </span>
                    <span className={cn("mt-2 block max-w-xs text-sm text-white/80 sm:text-base", small && "hidden sm:block")}>
                      {tile.text}
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
