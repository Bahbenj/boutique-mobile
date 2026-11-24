"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteProduct, duplicateProduct, quickUpdateProduct, setProductActive } from "@/app/admin/(panel)/produits/actions";
import { conditionLabels, parseAmount, type DbProduct } from "@/lib/admin/schema";
import { cn, formatPrice } from "@/lib/utils";
import { useUI } from "@/lib/ui-store";
import { Badge } from "@/components/ui/Badge";
import { IconCheck, IconCopy, IconImage, IconMinus, IconPencil, IconPlus, IconSpinner, IconTrash } from "@/components/ui/icons";
import { ConfirmDialog, IconButton, Switch } from "../ui";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Ligne de la liste produits : carte empilée sur mobile, ligne de tableau sur
 * desktop. Prix et stock modifiables sur place (enregistrement automatique).
 */
export function ProductRow({ product: p, categoryName }: { product: DbProduct; categoryName?: string }) {
  const toast = useUI((s) => s.showToast);
  const hasVariants = Boolean(p.variants?.storage?.length);

  // --- Prix ---
  const [price, setPrice] = useState(String(p.price));
  const [priceState, setPriceState] = useState<SaveState>("idle");
  const savePrice = async () => {
    const value = parseAmount(price);
    if (value === Number(p.price)) return;
    if (value === null || Number.isNaN(value)) {
      setPriceState("error");
      return;
    }
    setPriceState("saving");
    const res = await quickUpdateProduct({ id: p.id, price: value });
    setPriceState(res.ok ? "saved" : "error");
    if (!res.ok) toast({ title: "Prix non enregistré", text: res.error });
  };

  // --- Stock (enregistré 600 ms après le dernier changement) ---
  const [stock, setStock] = useState(p.stock);
  const [stockState, setStockState] = useState<SaveState>("idle");
  const stockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(stockTimer.current), []);
  const changeStock = (next: number) => {
    const value = Math.max(0, Math.min(100_000, Math.round(next) || 0));
    setStock(value);
    clearTimeout(stockTimer.current);
    stockTimer.current = setTimeout(async () => {
      if (value === p.stock) return;
      setStockState("saving");
      const res = await quickUpdateProduct({ id: p.id, stock: value });
      setStockState(res.ok ? "saved" : "error");
      if (!res.ok) toast({ title: "Stock non enregistré", text: res.error });
    }, 600);
  };

  // --- Visibilité, duplication, suppression ---
  const [active, setActive] = useState(p.is_active);
  const [pendingActive, startActive] = useTransition();
  const [pendingDup, startDup] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [pendingDelete, startDelete] = useTransition();

  const toggle = (value: boolean) => {
    setActive(value);
    startActive(async () => {
      const res = await setProductActive(p.id, value);
      if (!res.ok) {
        setActive(!value);
        toast({ title: "Modification impossible", text: res.error });
      }
    });
  };

  const stockTone = stock === 0 ? "text-red-700" : stock <= 3 ? "text-accent-hover" : "text-ink";

  return (
    <li className={cn("rounded-card bg-white p-3 shadow-soft transition-opacity sm:p-4 lg:rounded-none lg:p-0 lg:shadow-none", pendingDelete && "opacity-40")}>
      <div className="grid grid-cols-[3.5rem_1fr_auto] gap-x-3 gap-y-3 lg:grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_9.5rem_5.5rem_7.5rem] lg:items-center lg:gap-4 lg:px-4 lg:py-3">
        {/* Photo */}
        <Link href={`/admin/produits/${p.id}`} className="relative size-14 overflow-hidden rounded-2xl bg-cream-deep" tabIndex={-1} aria-hidden="true">
          {p.images[0] ? (
            <Image src={p.images[0]} alt="" fill sizes="56px" className={cn("object-cover", !active && "opacity-50 grayscale")} />
          ) : (
            <span className="grid size-full place-items-center text-muted">
              <IconImage size={20} />
            </span>
          )}
        </Link>

        {/* Nom + infos */}
        <div className="min-w-0">
          <Link href={`/admin/produits/${p.id}`} className="line-clamp-2 font-bold leading-snug hover:underline">
            {p.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">
            {[categoryName ?? "Sans catégorie", p.brand, p.condition !== "neuf" && conditionLabels[p.condition]].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {!active && <Badge tone="cream">Hors ligne</Badge>}
            {stock === 0 && <Badge tone="dark">Rupture</Badge>}
            {p.is_featured && <Badge tone="accent">Vedette</Badge>}
          </div>
        </div>

        {/* Interrupteur (mobile : en haut à droite) */}
        <div className="lg:hidden">
          <Switch checked={active} onChange={toggle} disabled={pendingActive} label={`${p.name} en ligne`} />
        </div>

        {/* Prix */}
        <div className="col-span-3 grid grid-cols-2 gap-3 border-t border-line pt-3 lg:contents">
          <div>
            <span className="mb-1 block text-xs font-semibold text-muted lg:sr-only">Prix</span>
            {hasVariants ? (
              <Link href={`/admin/produits/${p.id}`} className="flex h-11 items-center text-sm font-semibold hover:underline" title="Prix défini par capacité">
                dès {formatPrice(Number(p.price))}
              </Link>
            ) : (
              <label className="relative block">
                <span className="sr-only">Prix de {p.name} en dinars</span>
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setPriceState("idle");
                  }}
                  onBlur={savePrice}
                  onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                  aria-invalid={priceState === "error" || undefined}
                  className="h-11 w-full rounded-full border border-line bg-cream/60 ps-4 pe-14 text-[1rem] font-semibold tabular-nums outline-none focus:border-ink focus:bg-white focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-red-600"
                />
                <span className="pointer-events-none absolute end-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-semibold text-muted">
                  <SaveIcon state={priceState} />
                  DT
                </span>
              </label>
            )}
          </div>

          {/* Stock */}
          <div>
            <span className="mb-1 block text-xs font-semibold text-muted lg:sr-only">Stock</span>
            <div className="flex h-11 items-center rounded-full border border-line bg-cream/60 p-0.5">
              <button type="button" onClick={() => changeStock(stock - 1)} disabled={stock <= 0} aria-label={`Retirer 1 au stock de ${p.name}`} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white disabled:opacity-30">
                <IconMinus size={14} />
              </button>
              <input
                inputMode="numeric"
                value={stock}
                onChange={(e) => changeStock(Number(e.target.value.replace(/\D/g, "")))}
                aria-label={`Stock de ${p.name}`}
                className={cn("w-full min-w-0 bg-transparent text-center text-[1rem] font-bold tabular-nums outline-none", stockTone)}
              />
              <button type="button" onClick={() => changeStock(stock + 1)} aria-label={`Ajouter 1 au stock de ${p.name}`} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white">
                <IconPlus size={14} />
              </button>
              <span className="w-5 shrink-0">
                <SaveIcon state={stockState} />
              </span>
            </div>
          </div>
        </div>

        {/* Interrupteur (desktop) */}
        <div className="hidden lg:block">
          <Switch checked={active} onChange={toggle} disabled={pendingActive} label={`${p.name} en ligne`} />
        </div>

        {/* Actions */}
        <div className="col-span-3 -mx-1 -mb-1 flex justify-end gap-1 lg:col-span-1 lg:m-0">
          <Link href={`/admin/produits/${p.id}`} aria-label={`Modifier ${p.name}`} title="Modifier" className="grid size-10 place-items-center rounded-full text-ink/70 hover:bg-ink/5 hover:text-ink">
            <IconPencil size={18} />
          </Link>
          <IconButton label={`Dupliquer ${p.name}`} disabled={pendingDup} onClick={() => startDup(() => duplicateProduct(p.id))}>
            {pendingDup ? <IconSpinner size={18} /> : <IconCopy size={18} />}
          </IconButton>
          <IconButton label={`Supprimer ${p.name}`} tone="danger" onClick={() => setConfirm(true)}>
            <IconTrash size={18} />
          </IconButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Supprimer ce produit ?"
        confirmLabel="Supprimer définitivement"
        pending={pendingDelete}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          startDelete(async () => {
            const res = await deleteProduct(p.id);
            setConfirm(false);
            toast(res.ok ? { title: "Produit supprimé", text: p.name } : { title: "Suppression impossible", text: res.error });
          })
        }
      >
        <p>
          <strong className="text-ink">{p.name}</strong> et ses photos seront supprimés. Les commandes passées restent intactes.
        </p>
        <p className="mt-2">Pour le retirer temporairement du site, préférez l&apos;interrupteur « en ligne ».</p>
      </ConfirmDialog>
    </li>
  );
}

function SaveIcon({ state }: { state: SaveState }) {
  return (
    <span role="status" className="inline-flex">
      {state === "saving" && <IconSpinner size={14} />}
      {state === "saved" && <IconCheck size={14} className="text-whatsapp" />}
      <span className="sr-only">{state === "saving" ? "Enregistrement…" : state === "saved" ? "Enregistré" : state === "error" ? "Valeur invalide" : ""}</span>
    </span>
  );
}
