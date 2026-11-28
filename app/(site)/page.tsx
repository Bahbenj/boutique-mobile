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
      {/* Sous le haut de page : calcul différé tant que la section est loin (globals.css → cv-auto) */}
      <div className="cv-auto">
        <CategoryBento index={n("rayons")} />
      </div>
      <div className="cv-auto">
        <FeaturedProducts index={n("selection")} />
      </div>
      <div className="cv-auto">
        <OrderSteps index={n("commander")} />
      </div>
      <div className="cv-auto">
        <Services index={n("services")} />
      </div>
      <div className="cv-auto">
        <Reviews index={n("avis")} reviews={reviews} />
      </div>
      <div className="cv-auto">
        <Faq index={n("faq")} />
      </div>
      <div className="cv-auto">
        <StoreVisit index={n("magasin")} />
      </div>
    </>
  );
}
