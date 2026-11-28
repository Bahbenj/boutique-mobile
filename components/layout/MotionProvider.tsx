"use client";

import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("@/lib/motion-features").then((m) => m.default);

/**
 * Animations (panier, menu, fenêtres, notifications, apparitions) : seul le petit
 * composant `m` est dans le JavaScript de départ ; le moteur (≈ 100 Ko) arrive
 * ensuite. strict : un `motion.div` oublié provoque une erreur en développement
 * (il rechargerait tout le moteur) ; utiliser `m.div`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
