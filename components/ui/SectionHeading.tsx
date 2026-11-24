import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

/** En-tête de section : badge numéroté, grand titre, chapô et action optionnels. */
export function SectionHeading({
  index,
  kicker,
  title,
  lead,
  action,
  tone = "light",
  id,
  className,
}: {
  index?: number;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  tone?: "light" | "dark";
  id?: string;
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-3xl">
        <Badge index={index} tone={dark ? "glass" : "light"}>
          {kicker}
        </Badge>
        <h2
          id={id}
          className="mt-4 text-[clamp(2.25rem,7vw,4.25rem)] leading-[0.95] font-extrabold tracking-[-0.04em]"
        >
          {typeof title === "string" && title.endsWith(".") ? (
            <>
              {title.slice(0, -1)}
              <span className="text-accent">.</span>
            </>
          ) : (
            title
          )}
        </h2>
        {lead && (
          <p className={cn("mt-4 max-w-xl text-base leading-relaxed sm:text-lg", dark ? "text-cream/70" : "text-muted")}>
            {lead}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
