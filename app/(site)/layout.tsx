import { AuthModal } from "@/components/layout/AuthModal";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { MetaPixel } from "@/components/layout/MetaPixel";
import { MobileActionBar } from "@/components/layout/MobileActionBar";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/layout/Toaster";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { isOnlyCod } from "@/data/home";
import { META_PIXEL_ID, pixelEnabled } from "@/lib/meta-pixel";
import { getCheckoutSettings, getStoreSettings } from "@/lib/storefront";
import { StoreInfoProvider } from "@/components/layout/StoreInfoProvider";

/** Habillage du site public (l'admin a le sien, voir app/admin). */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  // Seuil de livraison offerte et paiements réglés dans l'admin (en cache, repli : config/site.ts)
  const [{ freeFrom, payments }, { store, announcement }] = await Promise.all([getCheckoutSettings(), getStoreSettings()]);
  return (
    <StoreInfoProvider value={store}>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Aller au contenu
      </a>
      <Navbar announcement={announcement} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppFab />
      <MobileActionBar />
      <CartDrawer freeFrom={freeFrom} onlyCod={isOnlyCod(payments)} />
      <AuthModal />
      <Toaster />
      <MetaPixel />
      {pixelEnabled && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel de suivi sans JavaScript */}
          <img height="1" width="1" alt="" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
        </noscript>
      )}
    </StoreInfoProvider>
  );
}
