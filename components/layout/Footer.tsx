import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import { IconFacebook, IconInstagram, IconTiktok } from "@/components/ui/icons";
import { CurrentYear } from "./CurrentYear";
import { Logo } from "./Logo";
import { navLinks } from "./nav-links";

const socials = [
  { href: siteConfig.social.instagram, label: "Instagram", Icon: IconInstagram },
  { href: siteConfig.social.facebook, label: "Facebook", Icon: IconFacebook },
  { href: siteConfig.social.tiktok, label: "TikTok", Icon: IconTiktok },
];

const infoLinks = [
  { href: "/a-propos", label: t.nav.about },
  { href: "/contact", label: t.nav.contact },
  { href: "/retours-garantie", label: t.footer.returns },
  { href: "/cgv", label: t.footer.terms },
];

const linkClass = "text-[0.9375rem] text-ink/70 transition-colors hover:text-ink";

/** Footer clair en colonnes + mention légale. */
export function Footer() {
  const { address } = siteConfig;
  return (
    <footer className="mt-auto border-t border-line bg-cream pt-16 pb-28 md:pb-10">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">{siteConfig.description}</p>
            <ul className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full bg-white text-ink shadow-soft transition-colors hover:bg-ink hover:text-cream"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterCol title={t.footer.shop}>
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </FooterCol>

          <FooterCol title={t.footer.info}>
            {infoLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </FooterCol>

          <FooterCol title={t.footer.contact}>
            <li className="text-[0.9375rem] text-ink/70">
              {address.street}, {address.postalCode} {address.city}
            </li>
            <li>
              <a href={`tel:${siteConfig.phone.replace(/\s/g, "")}`} className={linkClass}>
                {siteConfig.phone}
              </a>
            </li>
            {siteConfig.hours.map((h) => (
              <li key={h.days} className="text-[0.9375rem] text-ink/70">
                <span className="text-ink">{h.days}</span> · {h.time}
              </li>
            ))}
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear /> {siteConfig.name}. {t.footer.rights}
          </p>
          <p>Paiement à la livraison · Livraison dans les 24 gouvernorats</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-tight text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}
