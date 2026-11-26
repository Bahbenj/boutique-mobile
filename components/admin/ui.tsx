"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/** Interrupteur on/off accessible (role="switch"). */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  showLabel = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 items-center gap-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-fg/25",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[inset-inline-start] duration-200",
            checked ? "start-[1.125rem]" : "start-0.5",
          )}
        />
      </span>
      {showLabel && label}
    </button>
  );
}

/** Bouton icône rond (40 px : cible tactile confortable). */
export function IconButton({ label, className, tone = "light", ...props }: ComponentProps<"button"> & { label: string; tone?: "light" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40",
        tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-fg/70 hover:bg-fg/5 hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

/** Demande de confirmation avant une action destructive. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Annuler",
  pendingLabel = "Suppression…",
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-[0.9375rem] leading-relaxed text-muted">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="light" className="ring-1 ring-line" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button className="bg-danger text-canvas hover:brightness-110" onClick={onConfirm} disabled={pending}>
          {pending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/** Carte de section de formulaire. */
export function FormSection({ title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card bg-surface p-5 shadow-soft sm:p-6", className)}>
      <h2 className="text-lg font-extrabold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
