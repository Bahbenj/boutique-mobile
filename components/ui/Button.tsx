import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "light" | "outline" | "ghost" | "whatsapp";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  "transition-[background-color,color,transform,box-shadow] duration-200 ease-out " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  dark: "bg-ink text-cream hover:bg-ink-soft",
  light: "bg-white text-ink hover:bg-cream",
  outline: "border border-current/20 text-current hover:bg-current/5",
  ghost: "text-current hover:bg-ink/5",
  whatsapp: "bg-whatsapp text-[#0b3d1f] hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 px-7 text-base",
};

type Common = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode; // icône placée après le libellé
  className?: string;
  children?: ReactNode;
};

type AsButton = Common & ComponentProps<"button"> & { href?: undefined };
type AsLink = Common & Omit<ComponentProps<"a">, "href"> & { href: string };

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

/** Bouton pilule. Devient un lien si `href` est fourni (externe → <a>). */
export function Button(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", icon, className, children, ...rest } = props;
  const classes = buttonClasses(variant, size, className);
  const content = (
    <>
      {children}
      {icon}
    </>
  );

  if (typeof rest.href === "string") {
    const { href, ...anchor } = rest as AsLink;
    const external = /^(https?:|mailto:|tel:)/.test(href);
    if (external) {
      return (
        <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...anchor}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchor}>
        {content}
      </Link>
    );
  }

  const { type = "button", ...button } = rest as AsButton;
  return (
    <button type={type} className={classes} {...button}>
      {content}
    </button>
  );
}
