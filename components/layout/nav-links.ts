import { siteConfig } from "@/config/site";
import { t } from "@/i18n";

/** Liens principaux, partagés entre navbar et footer. */
export const navLinks = [
  { href: "/boutique", label: t.nav.shop },
  ...(siteConfig.features.services ? [{ href: "/#services", label: t.nav.services }] : []),
  { href: "/a-propos", label: t.nav.about },
  { href: "/contact", label: t.nav.contact },
];
