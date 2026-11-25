import { AuthModal } from "@/components/layout/AuthModal";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { MetaPixel } from "@/components/layout/MetaPixel";
import { MobileActionBar } from "@/components/layout/MobileActionBar";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "@/components/layout/Toaster";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { META_PIXEL_ID, pixelEnabled } from "@/lib/meta-pixel";

/** Habillage du site public (l'admin a le sien, voir app/admin). */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Aller au contenu
      </a>
      <Navbar />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppFab />
      <MobileActionBar />
      <CartDrawer />
      <AuthModal />
      <Toaster />
      <MetaPixel />
      {pixelEnabled && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- pixel de suivi sans JavaScript */}
          <img height="1" width="1" alt="" style={{ display: "none" }} src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
        </noscript>
      )}
    </>
  );
}
