"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { reportProductReview } from "@/app/(site)/compte/avis/actions";
import type { PublicReview } from "@/lib/product-reviews";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { IconCheck } from "@/components/ui/icons";
import { Stars } from "./Stars";

type Sort = "recent" | "best" | "worst";
const sorts: [Sort, string][] = [
  ["recent", "Plus récents"],
  ["best", "Meilleures notes"],
  ["worst", "Notes les plus basses"],
];
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Bamako" });

/** Liste des avis publiés : tri, photos, réponse de la boutique, signalement. */
export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(6);
  const list = [...reviews].sort((a, b) =>
    sort === "best" ? b.rating - a.rating || b.created_at.localeCompare(a.created_at) : sort === "worst" ? a.rating - b.rating || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at),
  );
  return (
    <div>
      {reviews.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Trier les avis">
          {sorts.map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className={cn("min-h-10 rounded-full px-4 text-sm font-semibold ring-1", sort === k ? "bg-accent-soft ring-accent" : "bg-surface ring-line hover:ring-fg/40")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-3">
        {list.slice(0, shown).map((r) => (
          <ReviewItem key={r.id} review={r} />
        ))}
      </ul>
      {list.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 6)} className="mt-4 min-h-11 w-full rounded-full bg-surface text-sm font-semibold ring-1 ring-line hover:ring-fg/40">
          Voir plus d&apos;avis ({list.length - shown})
        </button>
      )}
    </div>
  );
}

function ReviewItem({ review: r }: { review: PublicReview }) {
  const toast = useUI((s) => s.showToast);
  const [reported, setReported] = useState(false);
  const [pending, start] = useTransition();
  const report = () =>
    start(async () => {
      const res = await reportProductReview(r.id);
      setReported(true);
      toast(res.ok ? { title: "Signalement envoyé", text: res.notice } : { title: "Signalement impossible", text: res.error, tone: "error" });
    });
  return (
    <li className="rounded-card bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} />
        {r.title && <p className="font-bold">{r.title}</p>}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span className="font-semibold text-fg">{r.author_name}</span>
        {r.verified_purchase && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
            <IconCheck size={12} strokeWidth={2.5} />
            Achat vérifié
          </span>
        )}
        <span>{day.format(new Date(r.created_at))}</span>
      </p>
      <p className="mt-2 leading-relaxed whitespace-pre-line">{r.body}</p>
      <p className={cn("mt-2 text-sm font-semibold", r.recommends ? "text-success" : "text-muted")}>
        {r.recommends ? "Recommande ce produit" : "Ne recommande pas ce produit"}
      </p>
      {r.photos.length > 0 && (
        <ul className="mt-3 flex gap-2">
          {r.photos.map((src, i) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer" className="relative block size-20 overflow-hidden rounded-xl bg-raised">
                <Image src={src} alt={`Photo ${i + 1} de ${r.author_name}`} fill sizes="80px" className="object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {r.reply && (
        <div className="mt-3 rounded-2xl bg-raised p-3 text-sm">
          <p className="font-semibold">Réponse de la boutique</p>
          <p className="mt-1 whitespace-pre-line text-fg/85">{r.reply}</p>
        </div>
      )}
      <div className="mt-2 text-end">
        <button type="button" onClick={report} disabled={pending || reported} className="min-h-9 text-xs font-semibold text-muted underline-offset-4 hover:text-fg hover:underline disabled:no-underline">
          {reported ? "Signalé" : "Signaler un abus"}
        </button>
      </div>
    </li>
  );
}
