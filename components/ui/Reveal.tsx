"use client";

import { m, useReducedMotion, type HTMLMotionProps } from "motion/react";

/**
 * Apparition au scroll (fade + translateY). `delay` permet le stagger
 * dans une grille : delay={i * 0.06}.
 */
export function Reveal({ delay = 0, y = 28, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    />
  );
}
