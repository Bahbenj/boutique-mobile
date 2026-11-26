"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bulle d'aide « ? » : une phrase d'explication au toucher (ou au clic),
 * refermée par Échap, un toucher ailleurs ou un second toucher.
 * Zone tactile de 44 px autour d'un rond discret de 22 px.
 */
export function HelpTip({ children, label = "Aide", className }: { children: ReactNode; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <span ref={root} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault(); // dans un <label> : ne pas activer le champ
          setOpen((o) => !o);
        }}
        className="-m-2.5 grid size-11 place-items-center rounded-full"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[22px] place-items-center rounded-full text-xs font-bold ring-1 transition-colors",
            open ? "bg-accent text-on-accent ring-accent" : "bg-raised text-muted ring-line hover:text-fg",
          )}
        >
          ?
        </span>
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute start-1/2 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl bg-raised p-3 text-sm leading-snug font-normal text-fg shadow-lift ring-1 ring-fg/10 rtl:translate-x-1/2"
        >
          {children}
        </span>
      )}
    </span>
  );
}
