"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useUI } from "@/lib/ui-store";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { IconCheck } from "@/components/ui/icons";

const DURATION = 3200;

/** Confirmation éphémère (ex. « Ajouté au panier »), au-dessus des tiroirs (≥ 640 px). */
export function Toaster() {
  const toast = useUI((s) => s.toast);
  const dismiss = useUI((s) => s.dismissToast);
  // Sous 640 px le tiroir couvre l'écran : il affiche lui-même la confirmation
  const cartOpen = useUI((s) => s.cartOpen);
  const mounted = useMounted();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(dismiss, DURATION);
    return () => clearTimeout(id);
  }, [toast, dismiss]);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      role="status"
      className={cn("pointer-events-none fixed inset-x-3 top-3 z-[80] flex justify-center sm:top-5", cartOpen && "max-sm:hidden")}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full bg-ink py-2 ps-2 pe-5 text-cream shadow-lift"
            onClick={dismiss}
          >
            {toast.image ? (
              <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-cream-deep">
                <Image src={toast.image} alt="" fill sizes="40px" className="object-cover" />
                <span className="absolute -end-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-accent text-accent-ink ring-2 ring-ink">
                  <IconCheck size={10} strokeWidth={3} />
                </span>
              </span>
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                <IconCheck size={18} strokeWidth={2.5} />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-bold">{toast.title}</span>
              {toast.text && <span className="block truncate text-xs text-cream/70">{toast.text}</span>}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
