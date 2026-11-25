import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { CSSProperties } from "react";
import { siteConfig } from "@/config/site";
import { dir, htmlLang } from "@/i18n";
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
    locale: "fr_FR",
    siteName: siteConfig.name,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: siteConfig.theme.canvas,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/** Couleurs de marque injectées depuis config/site.ts → theme. */
const { theme } = siteConfig;
const brandVars = {
  "--canvas": theme.canvas,
  "--surface": theme.surface,
  "--raised": theme.raised,
  "--fg": theme.fg,
  "--muted": theme.muted,
  "--accent": theme.accent,
  "--on-accent": theme.onAccent,
  "--gold": theme.gold,
  "--on-gold": theme.onGold,
  "--navy": theme.navy,
  "--danger": theme.danger,
  "--success": theme.success,
} as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={htmlLang} dir={dir} className={`${jakarta.variable} h-full antialiased`} style={brandVars}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
