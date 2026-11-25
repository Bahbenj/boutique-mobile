import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Carte anthracite à grand rayon et liseré discret : brique de base des grilles bento. */
export function Card({
  className,
  interactive = false,
  tone = "surface",
  ...props
}: ComponentProps<"div"> & { interactive?: boolean; tone?: "surface" | "deep" | "raised" }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card",
        tone === "surface" && "bg-surface shadow-soft",
        tone === "deep" && "bg-canvas ring-1 ring-fg/10",
        tone === "raised" && "bg-raised",
        interactive &&
          "transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}
