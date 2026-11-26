"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { moderateProductReview } from "@/app/admin/(panel)/avis/product-actions";
import type { AdminProductReview } from "@/lib/admin/product-reviews";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { TextareaField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Stars } from "@/components/product/Stars";

const statusLabel: Record<AdminProductReview["status"], string> = { pending: "À valider", published: "Publié", rejected: "Refusé", hidden: "Masqué" };
const when = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" });

/** Avis produits : valider, refuser avec motif, masquer, répondre publiquement. */
export function ProductReviewModeration({ reviews }: { reviews: AdminProductReview[] }) {
  const [filter, setFilter] = useState<"pending" | "all">(reviews.some((r) => r.status === "pending") ? "pending" : "all");
  const list = filter === "pending" ? reviews.filter((r) => r.status === "pending") : reviews;
  const pending = reviews.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer">
        {(
          [
            ["pending", `À valider (${pending})`],
            ["all", `Tous (${reviews.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn("min-h-10 rounded-full px-4 text-sm font-semibold ring-1", filter === k ? "bg-accent-soft ring-accent" : "bg-surface ring-line hover:ring-fg/40")}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="rounded-card bg-surface p-6 text-center shadow-soft">
          <p className="font-semibold">{filter === "pending" ? "Aucun avis à valider." : "Pas encore d'avis client."}</p>
          <p className="mt-1 text-sm text-muted">Les avis laissés sur les fiches produit arrivent ici avant d&apos;être visibles sur le site.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
          {list.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewCard({ review: r }: { review: AdminProductReview }) {
  const toast = useUI((s) => s.showToast);
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"reject" | "reply" | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const act = (action: "publish" | "hide" | "reject" | "reply", value?: string) =>
    start(async () => {
      const res = await moderateProductReview(action === "reject" || action === "reply" ? { id: r.id, action, text: value ?? "" } : { id: r.id, action });
      if (!res.ok) {
        if (dialog) setError(res.error);
        else toast({ title: "Pas enregistré", text: res.error, tone: "error" });
        return;
      }
      setDialog(null);
      toast({
        title: action === "publish" ? "Avis publié" : action === "reject" ? "Avis refusé" : action === "hide" ? "Avis masqué" : value ? "Réponse publiée" : "Réponse retirée",
        text: r.product_name,
      });
    });

  return (
    <li className={cn("rounded-card bg-surface p-4 shadow-soft", r.status === "pending" && "ring-1 ring-accent/50")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <a href={`/produit/${r.product_slug}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
          {r.product_name}
        </a>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", r.status === "published" ? "bg-success/15 text-success" : r.status === "pending" ? "bg-accent-soft ring-1 ring-accent/40" : "bg-canvas text-muted ring-1 ring-fg/15")}>
          {statusLabel[r.status]}
        </span>
        {r.report_count > 0 && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger">Signalé {r.report_count} fois</span>}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <Stars value={r.rating} />
        {r.title && <span className="font-semibold">{r.title}</span>}
      </p>
      <p className="mt-1 text-sm text-muted">
        {r.author_name} · {r.user_email} · {when.format(new Date(r.updated_at))}
        {r.verified_purchase && " · Achat vérifié"}
      </p>
      <p className="mt-2 whitespace-pre-line">{r.body}</p>
      <p className={cn("mt-1 text-sm font-semibold", r.recommends ? "text-success" : "text-muted")}>{r.recommends ? "Recommande" : "Ne recommande pas"}</p>
      {r.photos.length > 0 && (
        <ul className="mt-2 flex gap-2">
          {r.photos.map((src) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer" className="relative block size-16 overflow-hidden rounded-xl bg-raised">
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {r.status === "rejected" && r.reject_reason && <p className="mt-2 text-sm text-muted">Motif du refus : {r.reject_reason}</p>}
      {r.reply && <p className="mt-2 rounded-2xl bg-raised p-2.5 text-sm">Réponse de la boutique : {r.reply}</p>}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        {r.status !== "published" && (
          <Button size="sm" className="h-11" disabled={pending} onClick={() => act("publish")}>
            Publier
          </Button>
        )}
        {r.status !== "rejected" && (
          <Button
            size="sm"
            variant="light"
            className="h-11"
            disabled={pending}
            onClick={() => {
              setText("");
              setError(null);
              setDialog("reject");
            }}
          >
            Refuser
          </Button>
        )}
        {r.status === "published" && (
          <Button size="sm" variant="light" className="h-11" disabled={pending} onClick={() => act("hide")}>
            Masquer
          </Button>
        )}
        <Button
          size="sm"
          variant="light"
          className="h-11"
          disabled={pending}
          onClick={() => {
            setText(r.reply ?? "");
            setError(null);
            setDialog("reply");
          }}
        >
          {r.reply ? "Modifier la réponse" : "Répondre"}
        </Button>
      </div>

      <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === "reject" ? "Refuser cet avis" : "Répondre au nom de la boutique"}>
        <TextareaField
          label={dialog === "reject" ? "Motif (montré au client)" : "Réponse publique"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={dialog === "reject" ? 300 : 600}
          placeholder={dialog === "reject" ? "Ex. Avis hors sujet : il concerne la livraison d'un autre produit." : "Ex. Merci pour votre retour, à bientôt chez Mobile Empire !"}
        />
        {dialog === "reply" && <p className="mt-1 text-xs text-muted">Laissez vide pour retirer la réponse.</p>}
        {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="light" onClick={() => setDialog(null)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={() => act(dialog!, text)}>
            {dialog === "reject" ? "Refuser l'avis" : "Publier la réponse"}
          </Button>
        </div>
      </Modal>
    </li>
  );
}
