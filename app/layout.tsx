import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { CSSProperties } from "react";
import { siteConfig } from "@/config/site";
import { dir, htmlLang } from "@/i18n";
import { AuthModal } from "@/components/layout/AuthModal";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} · ${siteConfig.tagline} à ${siteConfig.address.city}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: siteConfig.name,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: siteConfig.colors.cream,
  width: "device-width",
  initialScale: 1,
};

/** Couleurs de marque injectées depuis config/site.ts. */
const brandVars = {
  "--cream": siteConfig.colors.cream,
  "--ink": siteConfig.colors.ink,
  "--accent": siteConfig.colors.accent,
  "--accent-ink": siteConfig.colors.accentInk,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={htmlLang} dir={dir} className={`${jakarta.variable} h-full antialiased`} style={brandVars}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-cream"
        >
          Aller au contenu
        </a>
        <Navbar />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsAppFab />
        <AuthModal />
      </body>
    </html>
  );
}
