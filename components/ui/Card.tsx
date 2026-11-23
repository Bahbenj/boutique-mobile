import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Carte blanche à grand rayon et ombre douce : brique de base des grilles bento. */
export function Card({
  className,
  interactive = false,
  tone = "white",
  ...props
}: ComponentProps<"div"> & { interactive?: boolean; tone?: "white" | "dark" | "cream" }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card",
        tone === "white" && "bg-white shadow-soft",
        tone === "dark" && "bg-ink text-cream",
        tone === "cream" && "bg-cream-deep",
        interactive &&
          "transition-[transform,box-shadow] duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}
