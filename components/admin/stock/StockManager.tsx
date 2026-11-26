"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { adjustStock, saveLowStockThreshold } from "@/app/admin/(panel)/stock/actions";
import { stockReasons, type StockMovement } from "@/lib/admin/stock-shared";
import type { StockProduct } from "@/lib/admin/stock";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { IconImage, IconMinus, IconPlus, IconSearch } from "@/components/ui/icons";

type Filter = "tous" | "rupture" | "faible";

const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" });

/**
 * Page Stock : saisie rapide (−/+ ou nombre, motif facultatif), seuil d'alerte
 * réglable et historique des mouvements (ventes, annulations, ajustements).
 */
export function StockManager({
  products,
  movements,
  historyReady,
  threshold,
  canManage = true,
}: {
  products: StockProduct[];
  movements: StockMovement[];
  historyReady: boolean;
  threshold: number;
  /** Propriétaire ou gérant : seuil réglable, liens vers les fiches produit (pas les vendeurs). */
  canManage?: boolean;
}) {
  const [tab, setTab] = useState<"stock" | "historique">("stock");
  const [filter, setFilter] = useState<Filter>("tous");
  const [q, setQ] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const counts = {
    tous: products.length,
    rupture: products.filter((p) => p.stock === 0).length,
    faible: products.filter((p) => p.stock > 0 && p.stock <= threshold).length,
  };
  const list = products.filter(
    (p) =>
      (filter === "tous" || (filter === "rupture" ? p.stock === 0 : p.stock > 0 && p.stock <= threshold)) && (!q.trim() || norm(p.name).includes(norm(q.trim()))),
  );
  const history = movements.filter((m) => !q.trim() || norm(m.product_name).includes(norm(q.trim())));

  return (
    <div>
      {canManage && (
        <div className="mb-5">
          <ThresholdCard threshold={threshold} />
        </div>
      )}

      <div role="tablist" aria-label="Affichage" className="flex gap-1 rounded-full bg-surface p-1 shadow-soft sm:inline-flex">
        {(
          [
            ["stock", "Stock actuel"],
            ["historique", "Historique"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("h-11 flex-1 rounded-full px-5 text-sm font-semibold whitespace-nowrap", tab === k ? "bg-fg text-canvas" : "text-muted hover:text-fg")}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">Rechercher un produit</span>
        <IconSearch size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un produit…"
          className="h-12 w-full rounded-full border border-line bg-surface ps-11 pe-4 text-[1rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/25"
        />
      </label>

      {tab === "stock" ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["tous", "Tous"],
                ["rupture", "En rupture"],
                ["faible", "Stock faible"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1",
                  filter === k ? "bg-accent-soft ring-accent" : "bg-surface ring-line hover:ring-fg/40",
                )}
              >
                {label}
                <span className="text-muted tabular-nums">{counts[k]}</span>
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="mt-4 rounded-card bg-surface p-6 text-center text-sm text-muted shadow-soft">
              {filter === "rupture" ? "Aucun produit en rupture. Bravo !" : filter === "faible" ? "Aucun produit en stock faible." : "Aucun produit trouvé."}
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-2">
              {list.map((p) => (
                <StockRow key={p.id} product={p} threshold={threshold} linked={canManage} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <History movements={history} ready={historyReady} linked={canManage} />
      )}
    </div>
  );
}

function ThresholdCard({ threshold }: { threshold: number }) {
  const toast = useUI((s) => s.showToast);
  const [value, setValue] = useState(String(threshold));
  const [pending, start] = useTransition();
  const n = Number(value);
  const changed = value.trim() !== "" && n !== threshold;
  const save = () =>
    start(async () => {
      const res = await saveLowStockThreshold(n);
      toast(res.ok ? { title: "Seuil enregistré", text: `Alerte à ${n} article${n > 1 ? "s" : ""} ou moins` } : { title: "Pas enregistré", text: res.error, tone: "error" });
    });
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-soft sm:flex-row sm:items-center">
      <label htmlFor="seuil" className="min-w-0 text-sm sm:flex-1">
        <span className="block font-semibold">Alerte « stock faible »</span>
        <span className="text-muted">Prévenez-moi quand il reste ce nombre d&apos;articles ou moins.</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id="seuil"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="h-11 w-20 rounded-full border border-line bg-raised text-center text-[1rem] font-bold tabular-nums outline-none focus:border-accent focus:ring-4 focus:ring-accent/25"
        />
        <Button onClick={save} disabled={!changed || pending} className="h-11">
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

function StockRow({ product: p, threshold, linked }: { product: StockProduct; threshold: number; linked: boolean }) {
  const toast = useUI((s) => s.showToast);
  const [value, setValue] = useState(String(p.stock));
  const [note, setNote] = useState("");
  const [synced, setSynced] = useState(p.stock);
  const [pending, start] = useTransition();
  if (synced !== p.stock) {
    setSynced(p.stock);
    setValue(String(p.stock));
  }
  const next = value === "" ? NaN : Number(value);
  const changed = Number.isInteger(next) && next !== p.stock;
  const shown = Number.isInteger(next) ? next : p.stock;

  const save = (target: number, motif: string, undo = true) =>
    start(async () => {
      const res = await adjustStock({ id: p.id, stock: target, note: motif || undefined });
      if (!res.ok) {
        toast({ title: "Pas enregistré", text: res.error, tone: "error" });
        return;
      }
      const previous = res.data.previous;
      setNote("");
      toast({
        title: `Stock : ${previous} → ${target}`,
        text: p.name,
        action: undo ? { label: "Annuler", onClick: () => save(previous, "Correction (annulation)", false) } : undefined,
      });
    });

  return (
    <li className="rounded-card bg-surface p-3 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-raised">
          {p.image ? (
            <Image
              src={p.image}
              alt=""
              fill
              sizes="48px"
              className={p.imageBg ? "object-contain p-1" : "object-cover"}
              style={p.imageBg ? { backgroundColor: p.imageBg } : undefined}
            />
          ) : (
            <span className="grid size-full place-items-center text-muted">
              <IconImage size={18} />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          {linked ? (
            <Link href={`/admin/produits/${p.id}`} className="line-clamp-2 leading-snug font-bold hover:underline">
              {p.name}
            </Link>
          ) : (
            <p className="line-clamp-2 leading-snug font-bold">{p.name}</p>
          )}
          <p className="truncate text-xs text-muted">
            {p.category}
            {!p.isActive && " · Masqué"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            p.stock === 0 ? "bg-danger-soft text-danger" : p.stock <= threshold ? "bg-gold-soft text-gold-text" : "bg-raised text-muted",
          )}
        >
          {p.stock === 0 ? "Rupture" : p.stock <= threshold ? "Stock faible" : "En stock"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 items-center rounded-full bg-raised ring-1 ring-line">
          <button
            type="button"
            onClick={() => setValue((v) => String(Math.max(0, (Number(v) || 0) - 1)))}
            disabled={shown <= 0}
            aria-label={`Retirer 1 au stock de ${p.name}`}
            className="grid size-11 shrink-0 place-items-center rounded-full disabled:opacity-40"
          >
            <IconMinus size={16} />
          </button>
          <input
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-label={`Stock de ${p.name}`}
            className="h-11 w-full min-w-0 bg-transparent text-center text-lg font-bold tabular-nums outline-none"
          />
          <button
            type="button"
            onClick={() => setValue((v) => String((Number(v) || 0) + 1))}
            aria-label={`Ajouter 1 au stock de ${p.name}`}
            className="grid size-11 shrink-0 place-items-center rounded-full"
          >
            <IconPlus size={16} />
          </button>
        </div>
        {changed && (
          <Button onClick={() => save(next, note.trim())} disabled={pending} className="h-11 shrink-0">
            {pending ? "…" : "Enregistrer"}
          </Button>
        )}
      </div>
      {changed && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="Motif (facultatif)"
            aria-label="Motif du changement (facultatif)"
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-raised px-4 text-[1rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/25"
          />
          <button
            type="button"
            onClick={() => {
              setValue(String(p.stock));
              setNote("");
            }}
            className="h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-muted hover:bg-fg/5 hover:text-fg"
          >
            Annuler
          </button>
        </div>
      )}
      {changed && (
        <p className="mt-1.5 ps-1 text-xs text-muted">
          {p.stock} → <strong className="text-fg">{next}</strong> ({next > p.stock ? "+" : "−"}
          {Math.abs(next - p.stock)})
        </p>
      )}
    </li>
  );
}

function History({ movements, ready, linked }: { movements: StockMovement[]; ready: boolean; linked: boolean }) {
  const grouped = movements;
  if (!ready) {
    return (
      <p className="mt-4 rounded-card bg-surface p-6 text-center text-sm text-muted shadow-soft">
        L&apos;historique apparaîtra après la mise à jour de la base (fichier all-in-one.sql).
      </p>
    );
  }
  if (!grouped.length) {
    return <p className="mt-4 rounded-card bg-surface p-6 text-center text-sm text-muted shadow-soft">Aucun mouvement pour l&apos;instant. Chaque vente, annulation ou modification apparaîtra ici.</p>;
  }
  return (
    <ol className="mt-4 divide-y divide-line rounded-card bg-surface shadow-soft">
      {grouped.map((m) => (
        <li key={m.id} className="flex items-start gap-3 p-3 sm:p-4">
          <span
            className={cn(
              "grid h-10 min-w-12 shrink-0 place-items-center rounded-xl px-2 text-sm font-extrabold tabular-nums",
              m.delta > 0 ? "bg-success/15 text-success" : "bg-danger-soft text-danger",
            )}
          >
            {m.delta > 0 ? `+${m.delta}` : `−${Math.abs(m.delta)}`}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {m.product_id && linked ? (
                <Link href={`/admin/produits/${m.product_id}`} className="font-bold hover:underline">
                  {m.product_name}
                </Link>
              ) : (
                <span className="font-bold">{m.product_name}</span>
              )}
              <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-semibold">{stockReasons[m.reason] ?? m.reason}</span>
            </p>
            <p className="text-sm text-muted">
              Reste {m.stock_after} · {when.format(new Date(m.created_at))}
              {m.actor && ` · ${m.actor}`}
            </p>
            {m.note && <p className="mt-0.5 text-sm">« {m.note} »</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
