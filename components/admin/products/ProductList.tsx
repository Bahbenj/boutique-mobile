"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { bulkUpdateProducts, duplicateProduct, quickUpdateProduct, type QuickPatch } from "@/app/admin/(panel)/produits/actions";
import { DEFAULT_LOW_STOCK } from "@/lib/admin/stock-shared";
import { parseAmount, type BulkInput, type DbProduct } from "@/lib/admin/schema";
import { useUI } from "@/lib/ui-store";
import { cn, formatAmount, formatPrice } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { IconCheck, IconClose, IconCopy, IconImage, IconMinus, IconPencil, IconPlus, IconSpinner, IconStar } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "../ui";

type Category = { id: string; name: string };

/** Promo du produit : en cours, programmée, terminée ou aucune. */
export function promoState(p: Pick<DbProduct, "promo_price" | "promo_starts_at" | "promo_ends_at">, now: number) {
  if (p.promo_price == null) return "none" as const;
  if (p.promo_ends_at && Date.parse(p.promo_ends_at) <= now) return "ended" as const;
  if (p.promo_starts_at && Date.parse(p.promo_starts_at) > now) return "scheduled" as const;
  return "active" as const;
}

const percentOff = (price: number, promo: number) => Math.round((1 - promo / price) * 100);

/**
 * Liste des produits de l'admin : cartes sur mobile, tableau sur ordinateur.
 * Actions sur place (en vente, prix, stock, mise en avant, dupliquer) avec
 * « Annuler », et sélection multiple pour les actions groupées.
 */
/** `now` : heure de lecture des données (fournie par la page serveur, pas d'horloge au rendu). */
/** Seuil « stock faible » réglé par le commerçant (page Stock). */
const LowStock = createContext(DEFAULT_LOW_STOCK);

export function ProductList({
  products,
  categories,
  now,
  lowStock = DEFAULT_LOW_STOCK,
}: {
  products: DbProduct[];
  categories: Category[];
  now: number;
  lowStock?: number;
}) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  // Produits disparus de la liste (filtre, suppression) : retirés de la sélection
  const visibleIds = products.map((p) => p.id).join(",");
  const [lastIds, setLastIds] = useState(visibleIds);
  if (visibleIds !== lastIds) {
    setLastIds(visibleIds);
    setSelected((s) => new Set([...s].filter((id) => products.some((p) => p.id === id))));
  }
  const allSelected = products.length > 0 && selected.size === products.length;

  return (
    <LowStock.Provider value={lowStock}>
      <div className={cn(selected.size > 0 && "pb-36 lg:pb-24")}>
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)))}
              className="size-5 accent-[var(--accent)]"
            />
            {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </label>
        </div>

        <div className="lg:overflow-hidden lg:rounded-card lg:bg-surface lg:shadow-soft">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[2.75rem_4rem_minmax(0,1fr)_10rem_9.5rem_8.5rem_8.5rem] items-center gap-3 border-b border-line px-4 py-3 text-xs font-semibold text-muted lg:grid"
          >
            <span />
            <span />
            <span>Produit</span>
            <span>Prix</span>
            <span>Stock</span>
            <span>En vente</span>
            <span className="text-end">Actions</span>
          </div>
          <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-line">
            {products.map((p) => (
              <ProductItem
                key={p.id}
                product={p}
                categoryName={p.category_id ? names.get(p.category_id) : undefined}
                selected={selected.has(p.id)}
                onSelect={() => toggle(p.id)}
                now={now}
              />
            ))}
          </ul>
        </div>

        {selected.size > 0 && <BulkBar ids={[...selected]} categories={categories} onDone={() => setSelected(new Set())} />}
      </div>
    </LowStock.Provider>
  );
}

// --- Une ligne / carte ---------------------------------------------------------------

function ProductItem({
  product: p,
  categoryName,
  selected,
  onSelect,
  now,
}: {
  product: DbProduct;
  categoryName?: string;
  selected: boolean;
  onSelect: () => void;
  now: number;
}) {
  const toast = useUI((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  // Valeurs affichées tout de suite (optimiste), recalées par les données serveur
  const [local, setLocal] = useState({
    is_active: p.is_active,
    is_featured: p.is_featured,
    stock: p.stock,
    price: Number(p.price),
  });
  const [synced, setSynced] = useState(p);
  if (synced !== p) {
    setSynced(p);
    setLocal({
      is_active: p.is_active,
      is_featured: p.is_featured,
      stock: p.stock,
      price: Number(p.price),
    });
  }

  const hasStorage = (p.variants?.storage?.length ?? 0) > 0;
  const promo = promoState(p, now);
  const noPrice = !hasStorage && local.price <= 0;

  /** Enregistre un changement ; en cas d'échec, revient en arrière ; sinon propose « Annuler ». */
  const save = (patch: QuickPatch, message: string, opts: { undo?: boolean } = { undo: true }) => {
    const before = { ...local };
    setLocal((l) => ({ ...l, ...patch }));
    startTransition(async () => {
      const res = await quickUpdateProduct({ id: p.id, ...patch });
      if (!res.ok) {
        setLocal(before);
        toast({ title: "Non enregistré", text: res.error, tone: "error" });
        return;
      }
      const previous = res.data.previous;
      toast({
        title: message,
        text: res.data.notice ?? p.name,
        ...(opts.undo && {
          action: {
            label: "Annuler",
            onClick: () => {
              setLocal((l) => ({ ...l, ...previous }));
              startTransition(async () => {
                const undo = await quickUpdateProduct({
                  id: p.id,
                  ...previous,
                });
                toast(
                  undo.ok
                    ? { title: "Modification annulée", text: p.name }
                    : {
                        title: "Annulation impossible",
                        text: undo.error,
                        tone: "error",
                      },
                );
              });
            },
          },
        }),
      });
    });
  };

  const lowStock = useContext(LowStock);
  const labels = [
    !local.is_active && {
      text: "Masqué",
      cls: "bg-canvas text-muted ring-1 ring-fg/15",
    },
    noPrice && { text: "Prix à renseigner", cls: "bg-danger-soft text-danger" },
    local.stock === 0 && { text: "Rupture", cls: "bg-danger-soft text-danger" },
    local.stock > 0 &&
      local.stock <= lowStock && {
        text: "Stock faible",
        cls: "bg-gold-soft text-gold-text",
      },
    promo === "active" && {
      text: `Promo −${percentOff(Number(p.price), Number(p.promo_price))} %`,
      cls: "bg-gold text-on-gold",
    },
    promo === "scheduled" && {
      text: "Promo programmée",
      cls: "bg-gold-soft text-gold-text",
    },
    promo === "ended" && {
      text: "Promo terminée",
      cls: "bg-canvas text-muted ring-1 ring-fg/15",
    },
  ].filter(Boolean) as { text: string; cls: string }[];

  return (
    <li
      className={cn(
        "rounded-card bg-surface p-3 shadow-soft ring-1 transition-colors sm:p-4 lg:rounded-none lg:p-0 lg:px-4 lg:py-3 lg:shadow-none lg:ring-0",
        selected ? "ring-accent lg:bg-accent-soft/60" : "ring-transparent",
        !local.is_active && "opacity-80",
      )}
    >
      <div className="grid grid-cols-[2.75rem_4rem_minmax(0,1fr)_2.75rem] items-center gap-x-2 gap-y-3 lg:grid-cols-[2.75rem_4rem_minmax(0,1fr)_10rem_9.5rem_8.5rem_8.5rem] lg:gap-3">
        {/* Sélection */}
        <label className="grid size-11 cursor-pointer place-items-center self-start lg:self-center">
          <span className="sr-only">Sélectionner {p.name}</span>
          <input type="checkbox" checked={selected} onChange={onSelect} className="size-5 accent-[var(--accent)]" />
        </label>

        {/* Photo */}
        <Link href={`/admin/produits/${p.id}`} tabIndex={-1} aria-hidden="true" className="relative size-16 overflow-hidden rounded-2xl bg-raised">
          {p.images[0] ? (
            <Image
              src={p.images[0]}
              alt=""
              fill
              sizes="64px"
              className={p.image_bg ? "object-contain p-1" : "object-cover"}
              style={p.image_bg ? { backgroundColor: p.image_bg } : undefined}
            />
          ) : (
            <span className="grid size-full place-items-center text-muted">
              <IconImage size={20} />
            </span>
          )}
        </Link>

        {/* Nom, catégorie, étiquettes */}
        <div className="min-w-0">
          <Link href={`/admin/produits/${p.id}`} className="line-clamp-2 leading-snug font-bold hover:underline">
            {p.name}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted">{[categoryName ?? "Sans catégorie", p.brand].filter(Boolean).join(" · ")}</p>
          {labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {labels.map((l) => (
                <span key={l.text} className={cn("rounded-full px-2 py-0.5 text-[0.7rem] leading-5 font-bold", l.cls)}>
                  {l.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mise en avant (mobile : en haut à droite ; ordinateur : colonne Actions) */}
        <StarButton
          active={local.is_featured}
          name={p.name}
          className="self-start lg:hidden"
          onToggle={() => save({ is_featured: !local.is_featured }, local.is_featured ? "Retiré de l'accueil" : "Mis en avant sur l'accueil")}
        />

        {/* Prix et stock : deux moitiés égales sur mobile, deux colonnes du tableau sur ordinateur */}
        <div className="col-span-full grid grid-cols-2 gap-2 lg:contents">
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-muted lg:sr-only">Prix</span>
            <PriceEditor
              product={p}
              price={local.price}
              hasStorage={hasStorage}
              promoActive={promo === "active"}
              onSave={(price) => save({ price }, `Prix : ${formatPrice(price)}`)}
            />
          </div>

          {/* Stock */}
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-muted lg:sr-only">Stock</span>
            <StockEditor name={p.name} stock={local.stock} onSave={(stock) => save({ stock }, `Stock : ${stock}`)} />
          </div>
        </div>

        {/* En vente / Masqué */}
        <div className="col-span-2 lg:col-span-1">
          <Switch
            checked={local.is_active}
            onChange={(v) => save({ is_active: v }, v ? "En vente sur le site" : "Masqué du site")}
            label={local.is_active ? "En vente" : "Masqué"}
            showLabel
          />
        </div>

        {/* Actions */}
        <div className="col-span-2 flex items-center justify-end gap-1 lg:col-span-1">
          {pending && <IconSpinner size={16} className="me-1 text-muted" />}
          <StarButton
            active={local.is_featured}
            name={p.name}
            className="hidden lg:grid"
            onToggle={() => save({ is_featured: !local.is_featured }, local.is_featured ? "Retiré de l'accueil" : "Mis en avant sur l'accueil")}
          />
          <form action={duplicateProduct.bind(null, p.id)}>
            <DuplicateButton name={p.name} />
          </form>
          <Link
            href={`/admin/produits/${p.id}`}
            aria-label={`Modifier ${p.name}`}
            title="Modifier"
            className="grid size-11 place-items-center rounded-full text-fg/70 hover:bg-fg/5 hover:text-fg"
          >
            <IconPencil size={18} />
          </Link>
        </div>
      </div>
    </li>
  );
}

function StarButton({ active, name, onToggle, className }: { active: boolean; name: string; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? `Retirer ${name} de l'accueil` : `Mettre ${name} en avant sur l'accueil`}
      title={active ? "Mis en avant sur l'accueil" : "Mettre en avant sur l'accueil"}
      className={cn("grid size-11 place-items-center rounded-full transition-colors hover:bg-fg/5", active ? "text-gold" : "text-fg/40", className)}
    >
      <IconStar size={20} filled={active} />
    </button>
  );
}

function DuplicateButton({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="submit"
      onClick={() => setBusy(true)}
      aria-label={`Dupliquer ${name}`}
      title="Dupliquer (crée une copie masquée à compléter)"
      className="grid size-11 place-items-center rounded-full text-fg/70 hover:bg-fg/5 hover:text-fg"
    >
      {busy ? <IconSpinner size={18} /> : <IconCopy size={18} />}
    </button>
  );
}

// --- Prix modifiable sur place ---------------------------------------------------------

function PriceEditor({
  product: p,
  price,
  hasStorage,
  promoActive,
  onSave,
}: {
  product: DbProduct;
  price: number;
  hasStorage: boolean;
  promoActive: boolean;
  onSave: (price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  if (hasStorage) {
    return (
      <Link href={`/admin/produits/${p.id}`} className="flex min-h-11 flex-col justify-center rounded-2xl px-1 text-sm">
        <span className="font-bold tabular-nums">dès {formatPrice(price)}</span>
        <span className="text-xs text-muted">Prix par capacité : dans la fiche</span>
      </Link>
    );
  }

  const commit = () => {
    const parsed = parseAmount(value);
    if (parsed === null || Number.isNaN(parsed) || parsed <= 0) {
      setError("Prix invalide");
      return;
    }
    setEditing(false);
    setError(null);
    if (parsed !== price) onSave(parsed);
  };

  if (editing) {
    return (
      <div>
        <div className="flex items-center gap-1">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Nouveau prix de {p.name} (FCFA)</span>
            <input
              ref={input}
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              aria-invalid={error ? true : undefined}
              className="h-11 w-full rounded-full border border-accent bg-raised ps-4 pe-12 text-[1rem] font-semibold tabular-nums outline-none focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-danger"
            />
            <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">FCFA</span>
          </label>
          <button
            type="button"
            onClick={commit}
            aria-label="Valider le prix"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
          >
            <IconCheck size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Annuler"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-fg/5"
          >
            <IconClose size={16} />
          </button>
        </div>
        {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(price > 0 ? formatAmount(price) : "");
        setEditing(true);
      }}
      aria-label={`Modifier le prix de ${p.name}`}
      className="group flex min-h-11 w-full items-center justify-between gap-1.5 rounded-2xl border border-line bg-raised/50 px-3 text-start hover:border-accent"
    >
      <span className="min-w-0">
        {price > 0 ? (
          <>
            <span className="block font-bold tabular-nums">{formatPrice(promoActive ? Number(p.promo_price) : price)}</span>
            {promoActive && <span className="block text-xs text-muted tabular-nums line-through">{formatPrice(price)}</span>}
          </>
        ) : (
          <span className="block font-semibold text-danger">À renseigner</span>
        )}
      </span>
      <IconPencil size={14} className="shrink-0 text-muted group-hover:text-accent" />
    </button>
  );
}

// --- Stock : − / + et saisie directe --------------------------------------------------

function StockEditor({ name, stock, onSave }: { name: string; stock: number; onSave: (stock: number) => void }) {
  const [value, setValue] = useState(String(stock));
  const [synced, setSynced] = useState(stock);
  if (synced !== stock) {
    setSynced(stock);
    setValue(String(stock));
  }
  // Plusieurs appuis rapides sur − / + : un seul enregistrement, 0,7 s après le dernier
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const schedule = (next: number) => {
    setValue(String(next));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => next !== stock && onSave(next), 700);
  };
  const lowStock = useContext(LowStock);
  const current = Number(value) || 0;
  const commit = () => {
    clearTimeout(timer.current);
    const n = Math.max(0, Math.min(100_000, Math.floor(Number(value.replace(/\D/g, "")) || 0)));
    setValue(String(n));
    if (n !== stock) onSave(n);
  };

  return (
    <div className="flex h-11 items-center rounded-full border border-line bg-raised/50">
      <button
        type="button"
        onClick={() => schedule(Math.max(0, current - 1))}
        disabled={current <= 0}
        aria-label={`Retirer 1 au stock de ${name}`}
        className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-fg/5 disabled:opacity-30"
      >
        <IconMinus size={16} />
      </button>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Stock de {name}</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          className={cn(
            "w-full bg-transparent text-center text-[1rem] font-bold tabular-nums outline-none",
            current === 0 ? "text-danger" : current <= lowStock && "text-gold-text",
          )}
        />
      </label>
      <button
        type="button"
        onClick={() => schedule(current + 1)}
        aria-label={`Ajouter 1 au stock de ${name}`}
        className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-fg/5"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}

// --- Actions groupées -------------------------------------------------------------------

function BulkBar({ ids, categories, onDone }: { ids: string[]; categories: Category[]; onDone: () => void }) {
  const toast = useUI((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"category" | "discount" | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [percent, setPercent] = useState("10");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const n = ids.length;
  const plural = n > 1 ? "s" : "";

  const run = (input: BulkInput, success: (count: number, skipped: number) => string) =>
    startTransition(async () => {
      const res = await bulkUpdateProducts(input);
      if (!res.ok) {
        setError(res.error);
        toast({
          title: "Action non effectuée",
          text: res.error,
          tone: "error",
        });
        return;
      }
      setDialog(null);
      setError(null);
      toast({ title: success(res.data.count, res.data.skipped) });
      onDone();
    });

  const toIso = (d: string, endOfDay = false) => (d ? new Date(`${d}T${endOfDay ? "23:59:59" : "00:00:00"}Z`).toISOString() : null);

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-accent/40 bg-raised/95 px-3 py-2.5 shadow-lift backdrop-blur-xl lg:bottom-0 lg:start-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <p className="me-auto text-sm font-bold" role="status">
            {n} produit{plural} sélectionné{plural}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="light"
              disabled={pending}
              onClick={() => run({ action: "hide", ids }, (c) => `${c} produit${c > 1 ? "s" : ""} masqué${c > 1 ? "s" : ""}`)}
            >
              Masquer
            </Button>
            <Button
              size="sm"
              variant="light"
              disabled={pending}
              onClick={() => run({ action: "show", ids }, (c) => `${c} produit${c > 1 ? "s" : ""} en vente`)}
            >
              Mettre en vente
            </Button>
            <Button size="sm" variant="light" disabled={pending} onClick={() => setDialog("category")}>
              Catégorie…
            </Button>
            <Button size="sm" disabled={pending} onClick={() => setDialog("discount")}>
              Remise %…
            </Button>
            <button type="button" onClick={onDone} aria-label="Désélectionner" className="grid size-9 place-items-center rounded-full text-muted hover:bg-fg/5">
              <IconClose size={16} />
            </button>
          </div>
        </div>
      </div>

      <Modal open={dialog === "category"} onClose={() => setDialog(null)} title={`Changer la catégorie de ${n} produit${plural}`}>
        <SelectField label="Nouvelle catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={error ?? undefined}>
          <option value="" disabled>
            Choisir…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="light" onClick={() => setDialog(null)}>
            Annuler
          </Button>
          <Button
            disabled={pending || !categoryId}
            onClick={() => run({ action: "category", ids, category_id: categoryId }, (c) => `Catégorie changée pour ${c} produit${c > 1 ? "s" : ""}`)}
          >
            Appliquer
          </Button>
        </div>
      </Modal>

      <Modal
        open={dialog === "discount"}
        onClose={() => setDialog(null)}
        title={`Remise sur ${n} produit${plural}`}
        description="Le prix normal reste affiché barré sur le site, avec le pourcentage."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Remise (%)"
            inputMode="numeric"
            value={percent}
            onChange={(e) => setPercent(e.target.value.replace(/\D/g, "").slice(0, 2))}
            className="sm:col-span-3"
          />
          <Field label="Début (facultatif)" type="date" value={starts} onChange={(e) => setStarts(e.target.value)} className="sm:col-span-3 lg:col-span-1" />
          <Field label="Fin (facultatif)" type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className="sm:col-span-3 lg:col-span-1" />
        </div>
        {error && <p className="mt-3 rounded-2xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            variant="light"
            disabled={pending}
            onClick={() => run({ action: "end-promo", ids }, (c) => `Promo arrêtée sur ${c} produit${c > 1 ? "s" : ""}`)}
          >
            Arrêter les promos
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                {
                  action: "discount",
                  ids,
                  percent: Number(percent),
                  promo_starts_at: toIso(starts),
                  promo_ends_at: toIso(ends, true),
                },
                (c, skipped) =>
                  `Remise de ${percent} % sur ${c} produit${c > 1 ? "s" : ""}${skipped ? ` (${skipped} ignoré${skipped > 1 ? "s" : ""} : prix par capacité ou à renseigner)` : ""}`,
              )
            }
          >
            Appliquer la remise
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Bouton flottant « Ajouter un produit » (mobile), au-dessus de la barre d'onglets. */
export function AddProductFab() {
  return (
    <Link
      href="/admin/produits/nouveau"
      className={buttonClasses("primary", "lg", "fixed end-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 shadow-lift lg:hidden")}
    >
      <IconPlus size={20} />
      Ajouter un produit
    </Link>
  );
}
