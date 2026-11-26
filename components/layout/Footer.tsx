import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig, telHref } from "@/config/site";
import { t } from "@/i18n";
import { reviewRequestMessage } from "@/data/home";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { Container } from "@/components/ui/Container";
import { IconFacebook, IconInstagram, IconMail, IconTiktok } from "@/components/ui/icons";
import { CurrentYear } from "./CurrentYear";
import { Logo } from "./Logo";
import { navLinks } from "./nav-links";
import { getStoreInfo } from "@/lib/storefront";
import { storeAddressOf, tiktokHandleOf } from "@/lib/store-info";


const infoLinks = [
  { href: "/a-propos", label: t.nav.about },
  { href: "/contact", label: t.nav.contact },
  { href: "/retours-garantie", label: t.footer.returns },
  { href: "/cgv", label: t.footer.terms },
];

const linkClass = "text-[0.9375rem] text-fg/70 transition-colors hover:text-fg";

/** Footer en colonnes + mention légale. */
export async function Footer() {
  const store = await getStoreInfo();
  const socials = [
    store.social.facebook && { href: store.social.facebook, label: "Facebook", Icon: IconFacebook },
    store.social.instagram && { href: store.social.instagram, label: "Instagram", Icon: IconInstagram },
    store.social.tiktok && { href: store.social.tiktok, label: `TikTok ${tiktokHandleOf(store.social.tiktok)}`, Icon: IconTiktok },
    store.email && { href: `mailto:${store.email}`, label: `E-mail : ${store.email}`, Icon: IconMail },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof IconMail }[];
  return (
    <footer className="mt-auto border-t border-line bg-canvas pt-16 pb-28 md:pb-10">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="max-w-xs">
            <Logo size="full" imgClassName="h-auto w-52" />
            <p className="mt-4 text-[0.9375rem] font-semibold text-gold-text">{siteConfig.slogan}</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
              {t.home.since(siteConfig.since)} · {siteConfig.description}.
            </p>
            <ul className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full bg-surface text-fg shadow-soft transition-colors hover:bg-accent hover:text-on-accent"
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
            <li className="text-[0.9375rem] text-fg/70">{storeAddressOf(store)}</li>
            {store.phones.map((p) => (
              <li key={p}>
                <a href={telHref(p)} className={cn(linkClass, "tabular-nums")}>
                  {p}
                </a>
              </li>
            ))}
            <li>
              <a href={whatsappLink(reviewRequestMessage, store.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-[0.9375rem] font-semibold text-gold-text transition-colors hover:text-fg">
                {t.home.leaveReview}
              </a>
            </li>
            {store.hours.map((h) => (
              <li key={h.days} className="text-[0.9375rem] text-fg/70">
                <span className="text-fg">{h.days}</span> · {h.time}
              </li>
            ))}
          </FooterCol>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <CurrentYear /> {siteConfig.name}. {t.footer.rights}
          </p>
          <p>{t.footer.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-tight text-fg">{title}</h2>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}
