"use client";

import { useMounted } from "@/lib/use-mounted";

/** Année courante, lue seulement après hydratation (pas de new Date() au prérendu). */
export function CurrentYear() {
  const mounted = useMounted();
  return <span>{mounted ? new Date().getFullYear() : null}</span>;
}
