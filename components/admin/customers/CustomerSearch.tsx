"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { IconSearch, IconSpinner } from "@/components/ui/icons";

/** Recherche (téléphone ou nom) et tri de la liste des clients, synchronisés avec l'URL. */
export function CustomerSearch({ sorts }: { sorts: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sort = params.get("tri") ?? "recent";

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div role="search" className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Rechercher un client par téléphone ou par nom</span>
        <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted">
          {pending ? <IconSpinner size={18} /> : <IconSearch size={18} />}
        </span>
        <input
          type="search"
          inputMode="search"
          value={q}
          placeholder="Téléphone ou nom, ex. 76 12 34 56"
          onChange={(e) => {
            setQ(e.target.value);
            clearTimeout(timer.current);
            const value = e.target.value.trim();
            timer.current = setTimeout(() => update("q", value), 250);
          }}
          className="h-12 w-full rounded-full border border-line bg-surface ps-11 pe-4 text-[1rem] outline-none focus:border-accent focus:ring-4 focus:ring-accent/25"
        />
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Trier">
        {Object.entries(sorts).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={sort === k}
            onClick={() => update("tri", k === "recent" ? "" : k)}
            className={cn(
              "min-h-10 rounded-full px-4 text-sm font-semibold ring-1",
              sort === k ? "bg-accent-soft ring-accent" : "bg-surface ring-line hover:ring-fg/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
