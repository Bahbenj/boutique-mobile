"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { orderStatuses, periods, sorts, statusLabels, type OrderStatus } from "@/lib/admin/orders-shared";
import { cn } from "@/lib/utils";
import { IconSearch, IconSpinner } from "@/components/ui/icons";

const chevron = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a9ba' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

/** Onglets de statut (avec compteurs), recherche, période et export, synchronisés avec l'URL. */
export function OrderFilters({ counts }: { counts: Record<OrderStatus, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    next.delete("page"); // tout changement de filtre revient à la 1re page
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `${pathname}${next.size ? `?${next}` : ""}`;
  };
  const update = (changes: Record<string, string | null>) =>
    startTransition(() => router.replace(hrefWith(changes), { scroll: false }));

  const current = params.get("statut");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs: { value: string | null; label: string; count: number }[] = [
    { value: null, label: "Toutes", count: total },
    ...orderStatuses.map((s) => ({ value: s, label: statusLabels[s], count: counts[s] })),
  ];

  // Export : mêmes filtres que la liste (hors recherche et pagination)
  const exportParams = new URLSearchParams();
  if (current) exportParams.set("statut", current);
  if (params.get("periode")) exportParams.set("periode", params.get("periode")!);

  return (
    <div className="space-y-3">
      <nav aria-label="Statut des commandes" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {tabs.map((tab) => {
          const active = (tab.value ?? null) === current;
          return (
            <Link
              key={tab.label}
              href={hrefWith({ statut: tab.value })}
              replace
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
                active ? "bg-accent text-on-accent" : "bg-surface text-fg shadow-soft hover:bg-fg/5",
              )}
            >
              {tab.label}
              <span className={cn("tabular-nums", active ? "text-on-accent" : "text-muted")}>{tab.count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 sm:flex-row" role="search">
        <label className="relative block flex-1">
          <span className="sr-only">Rechercher une commande</span>
          <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted">
            {pending ? <IconSpinner size={18} /> : <IconSearch size={18} />}
          </span>
          <input
            type="search"
            value={q}
            placeholder="N°, nom ou téléphone…"
            onChange={(e) => {
              setQ(e.target.value);
              clearTimeout(timer.current);
              const value = e.target.value.trim();
              timer.current = setTimeout(() => update({ q: value || null }), 300);
            }}
            className="h-11 w-full rounded-full border border-line bg-surface ps-11 pe-4 text-[1rem] outline-none placeholder:text-fg/40 focus:border-accent focus:ring-4 focus:ring-accent/25"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Trier par date"
            value={params.get("tri") ?? "recent"}
            onChange={(e) => update({ tri: e.target.value === "recent" ? null : e.target.value })}
            style={chevron}
            className="h-11 min-w-0 flex-1 appearance-none rounded-full border border-line bg-surface bg-[length:14px] bg-[position:right_0.9rem_center] bg-no-repeat ps-4 pe-9 text-sm font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/25 sm:flex-none"
          >
            {Object.entries(sorts).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Période"
            value={params.get("periode") ?? ""}
            onChange={(e) => update({ periode: e.target.value || null })}
            style={chevron}
            className="h-11 min-w-0 flex-1 appearance-none rounded-full border border-line bg-surface bg-[length:14px] bg-[position:right_0.9rem_center] bg-no-repeat ps-4 pe-9 text-sm font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/25 sm:flex-none"
          >
            <option value="">Toutes les dates</option>
            {Object.entries(periods).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <a
            href={`/admin/commandes/export${exportParams.size ? `?${exportParams}` : ""}`}
            download
            className="flex h-11 shrink-0 items-center justify-center rounded-full bg-surface px-4 text-sm font-semibold shadow-soft hover:bg-fg/5 max-sm:w-full"
          >
            Export CSV
          </a>
        </div>
      </div>
    </div>
  );
}
