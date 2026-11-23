"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/lib/use-dialog";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { IconClose } from "./icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
};

/** Modale centrée sur fond flouté, carte blanche arrondie. */
export function Modal({ open, onClose, title, description, children, className, closeLabel = "Fermer" }: ModalProps) {
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const panelRef = useDialog<HTMLDivElement>(open, onClose);
  const titleId = useId();
  const descId = useId();

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              "relative w-full max-w-md rounded-card-lg bg-white p-6 shadow-lift outline-none sm:p-8",
              className,
            )}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute end-4 top-4 grid size-10 place-items-center rounded-full bg-cream text-ink transition-colors hover:bg-cream-deep"
            >
              <IconClose size={18} />
            </button>
            <h2 id={titleId} className="pe-12 text-2xl font-extrabold sm:text-3xl">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-2 text-sm text-muted">
                {description}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
