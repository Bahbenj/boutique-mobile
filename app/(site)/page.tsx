import { siteConfig } from "@/config/site";
import { getPublishedReviews } from "@/lib/storefront";
import { HeroScroll } from "@/components/sections/HeroScroll";
import { CategoryBento } from "@/components/sections/home/CategoryBento";
import { Faq } from "@/components/sections/home/Faq";
import { FeaturedProducts } from "@/components/sections/home/FeaturedProducts";
import { OrderSteps } from "@/components/sections/home/OrderSteps";
import { Promises } from "@/components/sections/home/Promises";
import { Reviews } from "@/components/sections/home/Reviews";
import { Services } from "@/components/sections/home/Services";
import { StoreVisit } from "@/components/sections/home/StoreVisit";

export default async function HomePage() {
  const reviews = await getPublishedReviews();
  // Numérotation des badges « 01 · … » : les sections désactivées ne créent pas de trou
  const order = [
    "rayons",
    "selection",
    "commander",
    siteConfig.features.services && "services",
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
      <Services index={n("services")} />
      <Reviews index={n("avis")} reviews={reviews} />
      <Faq index={n("faq")} />
      <StoreVisit index={n("magasin")} />
    </>
  );
}
