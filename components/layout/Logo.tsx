import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Logo de la marque (fichiers de public/brand, voir config/site.ts → logo).
 *  - variant "dark"  : texte blanc et bleu, pour le site sombre
 *  - variant "light" : version d'origine (texte noir), bon de livraison, fonds clairs
 *  - size "compact"  : nom + sous-titre seuls (barre de navigation, admin)
 *  - size "full"     : logo complet avec les éclairs (pied de page, impression)
 * Sans fichier : logo texte provisoire (hexagone « ME » + « MOBILE EMPIRE »).
 */
type LogoProps = {
  className?: string;
  variant?: "dark" | "light";
  size?: "compact" | "full";
  href?: string | null;
  priority?: boolean;
  /** Remplace la taille par défaut de l'image (ex. "h-auto w-40"). */
  imgClassName?: string;
};

/** Dimensions intrinsèques des fichiers (ratio pour next/image). */
const intrinsic = { compact: { width: 869, height: 153 }, full: { width: 893, height: 485 } };

export function Logo({ className, variant = "dark", size = "compact", href = "/", priority = false, imgClassName }: LogoProps) {
  const { logo } = siteConfig;
  const src =
    variant === "dark" ? (size === "compact" ? logo.onDarkCompact : logo.onDark) : size === "compact" ? logo.onLightCompact : logo.onLight;

  const content = src ? (
    <Image
      src={src}
      alt={siteConfig.name}
      {...intrinsic[size]}
      preload={priority}
      sizes={size === "compact" ? "200px" : "320px"}
      className={imgClassName ?? (size === "compact" ? "h-7 w-auto sm:h-8" : "h-auto w-56")}
    />
  ) : (
    <LogoMark variant={variant} />
  );
  const classes = cn("flex shrink-0 items-center gap-2.5 whitespace-nowrap", className);

  if (!href) return <span className={classes}>{content}</span>;
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
        <span className={cn("text-[0.82rem] leading-none font-extrabold tracking-[0.14em] uppercase", dark ? "text-gold-text" : "text-accent")}>
          {siteConfig.name}
        </span>
      )}
    </>
  );
}
