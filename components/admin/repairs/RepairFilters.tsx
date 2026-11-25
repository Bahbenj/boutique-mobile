"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { repairStatuses, repairStatusLabels, type RepairStatus } from "@/lib/admin/repairs-shared";
import { cn } from "@/lib/utils";
import { IconSearch, IconSpinner } from "@/components/ui/icons";

/** Onglets de statut (avec compteurs) et recherche, synchronisés avec l'URL. */
export function RepairFilters({ counts }: { counts: Record<RepairStatus, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    return `${pathname}${next.size ? `?${next}` : ""}`;
  };

  const current = params.get("statut");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const tabs = [{ value: null as string | null, label: "Toutes", count: total }, ...repairStatuses.map((s) => ({ value: s as string | null, label: repairStatusLabels[s], count: counts[s] }))];

  return (
    <div className="space-y-3">
      <nav aria-label="Statut des demandes" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {tabs.map((tab) => {
          const active = tab.value === current;
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
      <label role="search" className="relative block">
        <span className="sr-only">Rechercher une demande</span>
        <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted">
          {pending ? <IconSpinner size={18} /> : <IconSearch size={18} />}
        </span>
        <input
          type="search"
          value={q}
          placeholder="N°, nom, téléphone ou modèle…"
          onChange={(e) => {
            setQ(e.target.value);
            clearTimeout(timer.current);
            const value = e.target.value.trim();
            timer.current = setTimeout(() => startTransition(() => router.replace(hrefWith({ q: value || null }), { scroll: false })), 300);
          }}
          className="h-11 w-full rounded-full border border-line bg-surface ps-11 pe-4 text-[1rem] outline-none placeholder:text-fg/40 focus:border-accent focus:ring-4 focus:ring-accent/25"
        />
      </label>
    </div>
  );
}
