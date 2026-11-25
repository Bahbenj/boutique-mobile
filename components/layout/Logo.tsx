import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Logo de la marque. Deux variantes, comme la charte de la page Facebook :
 *  - "dark"  : doré sur fond noir (site) → siteConfig.logo.onDark
 *  - "light" : bleu sur fond blanc (impression, fonds clairs) → siteConfig.logo.onLight
 * Sans fichier fourni : monogramme hexagonal + nom en capitales.
 */
export function Logo({ className, variant = "dark", href = "/" }: { className?: string; variant?: "dark" | "light"; href?: string | null }) {
  const src = variant === "dark" ? siteConfig.logo.onDark : siteConfig.logo.onLight;
  const content = src ? (
    <Image src={src} alt="" width={160} height={40} className="h-9 w-auto" priority />
  ) : (
    <LogoMark variant={variant} />
  );
  const classes = cn("flex shrink-0 items-center gap-2.5 whitespace-nowrap", className);

  if (!href) return <span className={classes}>{content}<span className="sr-only">{siteConfig.name}</span></span>;
  return (
    <Link href={href} className={classes} aria-label={`${siteConfig.name}, accueil`}>
      {content}
    </Link>
  );
}

/** Logo texte provisoire : hexagone « ME » et « MOBILE EMPIRE ». */
export function LogoMark({ variant = "dark", compact = false }: { variant?: "dark" | "light"; compact?: boolean }) {
  const dark = variant === "dark";
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "hex grid h-9 w-8 shrink-0 place-items-center text-[0.68rem] font-extrabold tracking-tight",
          dark ? "bg-gradient-to-b from-gold-hover to-gold text-on-gold" : "bg-accent text-on-accent",
        )}
      >
        {siteConfig.shortName}
      </span>
      {!compact && (
        <span
          aria-hidden="true"
          className={cn("text-[0.82rem] leading-none font-extrabold tracking-[0.14em] uppercase", dark ? "text-gold-text" : "text-accent")}
        >
          {siteConfig.name}
        </span>
      )}
    </>
  );
}
