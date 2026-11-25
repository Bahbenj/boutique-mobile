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
const DURATION_WITH_ACTION = 7000; // le temps de lire et d'appuyer sur « Annuler »

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
    const id = setTimeout(dismiss, toast.action ? DURATION_WITH_ACTION : DURATION);
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
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full bg-raised py-2 ps-2 text-fg shadow-lift ring-1",
              toast.tone === "error" ? "ring-danger/50" : "ring-accent/30",
              toast.action ? "pe-2" : "pe-5",
            )}
            onClick={toast.action ? undefined : dismiss}
          >
            {toast.image ? (
              <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-raised">
                <Image src={toast.image} alt="" fill sizes="40px" className="object-cover" />
                <span className="absolute -end-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-accent text-on-accent ring-2 ring-fg">
                  <IconCheck size={10} strokeWidth={3} />
                </span>
              </span>
            ) : toast.tone === "error" ? (
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-danger text-canvas text-lg font-extrabold">
                !
              </span>
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                <IconCheck size={18} strokeWidth={2.5} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">{toast.title}</span>
              {toast.text && <span className={cn("block text-xs text-muted", toast.tone === "error" || toast.action ? "line-clamp-2" : "truncate")}>{toast.text}</span>}
            </span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss();
                }}
                className="h-11 shrink-0 rounded-full bg-fg px-4 text-sm font-bold text-canvas hover:bg-fg-soft"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
