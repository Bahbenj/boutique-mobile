import { siteConfig } from "@/config/site";
import { reviews } from "@/data/home";
import { HeroScroll } from "@/components/sections/HeroScroll";
import { CategoryBento } from "@/components/sections/home/CategoryBento";
import { Faq } from "@/components/sections/home/Faq";
import { FeaturedProducts } from "@/components/sections/home/FeaturedProducts";
import { OrderSteps } from "@/components/sections/home/OrderSteps";
import { Promises } from "@/components/sections/home/Promises";
import { RepairSection } from "@/components/sections/home/RepairSection";
import { Reviews } from "@/components/sections/home/Reviews";
import { StoreVisit } from "@/components/sections/home/StoreVisit";

export default function HomePage() {
  // Numérotation des badges « 01 · … » : les sections désactivées ne créent pas de trou
  const order = [
    "rayons",
    "selection",
    "commander",
    siteConfig.features.repair && "reparation",
    reviews.length > 0 && "avis",
    "faq",
    "magasin",
  ].filter(Boolean);
  const n = (key: string) => order.indexOf(key) + 1;

  return (
    <>
      <HeroScroll />
      <Promises />
      <CategoryBento index={n("rayons")} />
      <FeaturedProducts index={n("selection")} />
      <OrderSteps index={n("commander")} />
      <RepairSection index={n("reparation")} />
      <Reviews index={n("avis")} />
      <Faq index={n("faq")} />
      <StoreVisit index={n("magasin")} />
    </>
  );
}
