"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { productStatusFilters } from "@/lib/admin/schema";
import { cn } from "@/lib/utils";
import { IconSearch, IconSpinner } from "@/components/ui/icons";

const selectClass =
  "h-11 min-w-0 appearance-none rounded-full border border-line bg-surface bg-[length:14px] bg-[position:right_0.9rem_center] bg-no-repeat ps-4 pe-9 text-sm font-semibold text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/25";
const chevron = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a9ba' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

/** Recherche + filtres de la liste produits, synchronisés avec l'URL (partageable, retour arrière). */
export function ProductFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center" role="search">
      <label className="relative block flex-1">
        <span className="sr-only">Rechercher un produit</span>
        <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted">
          {pending ? <IconSpinner size={18} /> : <IconSearch size={18} />}
        </span>
        <input
          type="search"
          value={q}
          placeholder="Rechercher un produit…"
          onChange={(e) => {
            setQ(e.target.value);
            clearTimeout(timer.current);
            const value = e.target.value.trim();
            timer.current = setTimeout(() => update("q", value), 200);
          }}
          className="h-11 w-full rounded-full border border-line bg-surface ps-11 pe-4 text-[1rem] outline-none placeholder:text-fg/40 focus:border-accent focus:ring-4 focus:ring-accent/25"
        />
      </label>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <select aria-label="Catégorie" className={cn(selectClass, "shrink-0")} style={chevron} value={params.get("categorie") ?? ""} onChange={(e) => update("categorie", e.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="aucune">Sans catégorie</option>
        </select>
        <select aria-label="Statut" className={cn(selectClass, "shrink-0")} style={chevron} value={params.get("statut") ?? ""} onChange={(e) => update("statut", e.target.value)}>
          <option value="">Tous les produits</option>
          {Object.entries(productStatusFilters).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Trier par" className={cn(selectClass, "shrink-0")} style={chevron} value={params.get("tri") ?? ""} onChange={(e) => update("tri", e.target.value)}>
          <option value="">Plus récents</option>
          <option value="nom">Nom A → Z</option>
          <option value="stock">Stock le plus bas</option>
          <option value="prix">Prix le plus haut</option>
        </select>
      </div>
    </div>
  );
}
