"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { createPortal } from "react-dom";
import { t } from "@/i18n";
import { cartCount, cartSubtotal, useCart } from "@/lib/cart-store";
import { useDialog } from "@/lib/use-dialog";
import { useMounted } from "@/lib/use-mounted";
import { useUI } from "@/lib/ui-store";
import { formatPrice } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { IconArrowRight, IconBag, IconCheck, IconClose, IconTruck } from "@/components/ui/icons";
import { QtyStepper } from "./QtyStepper";

/**
 * Tiroir panier latéral (pleine hauteur, pleine largeur sur mobile).
 * `freeFrom` : seuil de livraison offerte réglé dans l'admin (null = jamais) ;
 * `onlyCod` : seul le paiement à la livraison est proposé.
 */
export function CartDrawer({ freeFrom, onlyCod }: { freeFrom: number | null; onlyCod: boolean }) {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const toast = useUI((s) => s.toast);
  const { items, setQty, remove } = useCart();
  const mounted = useMounted();
  const reduce = useReducedMotion();
  const panelRef = useDialog<HTMLDivElement>(open, close);
  const titleId = useId();

  if (!mounted) return null;

  const count = cartCount(items);
  const subtotal = cartSubtotal(items);
  const left = freeFrom == null ? 0 : Math.max(0, freeFrom - subtotal);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex h-full w-full max-w-md flex-col bg-canvas shadow-lift outline-none sm:m-3 sm:h-[calc(100%-1.5rem)] sm:rounded-card-lg"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex items-center gap-3 px-5 pt-5 pb-4">
              <h2 id={titleId} className="flex-1 text-2xl font-extrabold">
                {t.cart.title}
                {count > 0 && <span className="ms-2 text-base font-semibold text-muted tabular-nums">({count})</span>}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={t.nav.close}
                className="grid size-10 place-items-center rounded-full bg-surface text-fg shadow-soft hover:bg-raised"
              >
                <IconClose size={18} />
              </button>
            </header>

            {/* Confirmation d'ajout dans le tiroir, sur mobile (le toast flottant y est masqué) */}
            <div role="status" aria-live="polite" className="sm:hidden">
              <AnimatePresence initial={false}>
                {toast && (
                  <motion.p
                    key={toast.id}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <span className="mx-5 mb-3 flex items-center gap-2.5 rounded-2xl bg-accent-soft px-3.5 py-3 text-sm text-fg ring-1 ring-accent/30">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                        <IconCheck size={14} strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="font-bold">{toast.title}</span>
                        {toast.text && <span className="text-muted"> · {toast.text}</span>}
                      </span>
                    </span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <span className="grid size-16 place-items-center rounded-full bg-surface shadow-soft">
                  <IconBag size={26} />
                </span>
                <p className="text-lg font-semibold">{t.cart.empty}</p>
                <Link href="/boutique" onClick={close} className={buttonClasses("dark", "md")}>
                  {t.cart.emptyCta}
                </Link>
              </div>
            ) : (
              <>
                {/* Progression vers la livraison offerte (masquée si jamais offerte) */}
                {freeFrom != null && (
                  <div className="mx-5 rounded-2xl bg-surface p-3.5 shadow-soft">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <IconTruck size={18} className="shrink-0 text-muted" />
                      {left > 0 ? t.cart.freeDeliveryLeft(formatPrice(left)) : t.cart.freeDeliveryReached}
                    </p>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-out-expo rtl:origin-right"
                        style={{ transform: `scaleX(${freeFrom > 0 ? Math.min(1, subtotal / freeFrom) : 1})` }}
                      />
                    </div>
                  </div>
                )}

                <ul className="mt-2 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-3 py-4">
                      <Link
                        href={`/produit/${item.slug}`}
                        onClick={close}
                        className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-raised"
                      >
                        <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <Link href={`/produit/${item.slug}`} onClick={close} className="block truncate font-bold hover:underline">
                              {item.name}
                            </Link>
                            {item.variant && <p className="truncate text-sm text-muted">{item.variant}</p>}
                          </div>
                          <p className="font-bold tabular-nums">{formatPrice(item.price * item.qty)}</p>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <QtyStepper value={item.qty} max={item.maxQty} onChange={(n) => setQty(item.key, n)} />
                          <button
                            type="button"
                            onClick={() => remove(item.key)}
                            className="text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline"
                          >
                            {t.cart.remove}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-line px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <p className="flex items-baseline justify-between">
                    <span className="font-semibold">{t.cart.subtotal}</span>
                    <span className="text-2xl font-extrabold tracking-tight tabular-nums">{formatPrice(subtotal)}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">{onlyCod ? t.cart.codNote : t.cart.payNote}</p>
                  <Link
                    href="/commande"
                    onClick={close}
                    className={buttonClasses("primary", "lg", "mt-4 w-full")}
                  >
                    {t.cart.checkout}
                    <IconArrowRight size={18} className="rtl:rotate-180" />
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-2 h-11 w-full rounded-full text-sm font-semibold text-fg/70 hover:bg-fg/5 hover:text-fg"
                  >
                    {t.cart.continue}
                  </button>
                </footer>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
