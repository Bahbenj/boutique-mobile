import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Logo image si fourni dans site.ts, sinon monogramme + nom. */
export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("flex shrink-0 items-center gap-2 font-extrabold tracking-tight whitespace-nowrap", className)}
      aria-label={`${siteConfig.name}, accueil`}
    >
      {siteConfig.logo ? (
        <Image src={siteConfig.logo} alt="" width={120} height={32} className="h-8 w-auto" />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-accent to-gold text-on-accent text-[0.7rem] font-extrabold tracking-tight"
          >
            {siteConfig.shortName}
          </span>
          <span className={cn("text-[0.95rem] leading-none", onDark ? "text-white" : "text-fg")}>
            {siteConfig.name}
          </span>
        </>
      )}
    </Link>
  );
}
