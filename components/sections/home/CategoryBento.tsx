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
  layout: string; // placement dans la grille
  sizes: string;
};

/** Grille bento des rayons : Neufs en grand, puis Occasion, Accessoires, Réparation. */
export async function CategoryBento({ index }: { index: number }) {
  const [neufs, occasion, accessoires] = await getCategories();
  const repair = siteConfig.features.repair;

  const tiles: Tile[] = [
    {
      href: `/boutique/${neufs.slug}`,
      title: neufs.label,
      text: neufs.description,
      badge: t.home.models(neufs.count),
      image: neufs.image,
      alt: neufs.alt,
      layout: "col-span-2 aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:row-span-2",
      sizes: "(min-width: 1024px) 50vw, 100vw",
    },
    {
      href: `/boutique/${occasion.slug}`,
      title: occasion.label,
      text: occasion.description,
      badge: t.home.models(occasion.count),
      image: occasion.image,
      alt: occasion.alt,
      layout: "col-span-2 aspect-[16/10] lg:aspect-auto",
      sizes: "(min-width: 1024px) 50vw, 100vw",
    },
    {
      href: `/boutique/${accessoires.slug}`,
      title: accessoires.label,
      text: accessoires.description,
      badge: t.home.models(accessoires.count),
      image: accessoires.image,
      alt: accessoires.alt,
      layout: cn("aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto", !repair && "col-span-2"),
      sizes: "(min-width: 1024px) 25vw, 50vw",
    },
    ...(repair
      ? [
          {
            href: "#reparation",
            title: t.home.repairCardTitle,
            text: t.home.repairCardText,
            badge: t.home.repairKicker,
            image: repairImage.src,
            alt: repairImage.alt,
            layout: "aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto",
            sizes: "(min-width: 1024px) 25vw, 50vw",
          },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="rayons-title" className="py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading id="rayons-title" index={index} kicker={t.home.categoriesKicker} title={t.home.categoriesTitle} />
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:h-[40rem] lg:grid-cols-4 lg:grid-rows-2">
          {tiles.map((tile, i) => (
            <Reveal key={tile.href} delay={i * 0.06} className={cn("min-h-0", tile.layout)}>
              <Link
                href={tile.href}
                className="group relative flex h-full flex-col justify-end overflow-hidden rounded-card bg-ink p-4 text-white sm:p-6"
              >
                <Image
                  src={tile.image}
                  alt={tile.alt}
                  fill
                  sizes={tile.sizes}
                  quality={75}
                  className="object-cover transition-transform duration-1000 ease-out-expo group-hover:scale-105"
                />
                {/* Voiles : bas pour le titre, haut pour le badge sur photo claire */}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0" />
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-black/0" />
                <Badge tone="glass" className="absolute start-4 top-4 sm:start-6 sm:top-6">
                  {tile.badge}
                </Badge>
                <span
                  aria-hidden="true"
                  className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-white text-ink transition-[background-color,transform] duration-300 ease-out-expo group-hover:rotate-45 group-hover:bg-accent sm:end-6 sm:top-6 rtl:-scale-x-100"
                >
                  <IconArrowUpRight size={18} />
                </span>
                <span className="relative">
                  <span
                    className={cn(
                      "block leading-none font-extrabold tracking-[-0.04em]",
                      // Petites tuiles (demi-largeur mobile, quart desktop) : titre plus petit pour « Accessoires »
                      i < 2 || tile.layout.includes("col-span-2")
                        ? "text-[clamp(1.75rem,5vw,3.25rem)]"
                        : "text-[clamp(1.25rem,5.5vw,1.75rem)] lg:text-[1.625rem] xl:text-[2rem]",
                    )}
                  >
                    {tile.title}
                    <span className="text-accent">.</span>
                  </span>
                  <span className={cn("mt-2 block max-w-xs text-sm text-white/75 sm:text-base", i > 1 && "hidden sm:block")}>
                    {tile.text}
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
