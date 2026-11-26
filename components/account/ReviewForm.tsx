"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteProductReview, saveProductReview } from "@/app/(site)/compte/avis/actions";
import { uploadImage } from "@/lib/admin/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { IconClose, IconImage, IconSpinner } from "@/components/ui/icons";
import { Alert } from "./AuthForms";

export type MyReview = { id: string; rating: number; title: string; body: string; recommends: boolean; photos: string[]; status: string; reject_reason: string | null };

const labels = ["", "Très déçu", "Déçu", "Correct", "Bien", "Excellent"];

/** Avis sur un produit : note obligatoire, titre, commentaire, recommandation, 0 à 3 photos. */
export function ReviewForm({ productId, productSlug, userId, review }: { productId: string; productSlug: string; userId: string; review: MyReview | null }) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [title, setTitle] = useState(review?.title ?? "");
  const [body, setBody] = useState(review?.body ?? "");
  const [recommends, setRecommends] = useState<boolean | null>(review ? review.recommends : null);
  const [photos, setPhotos] = useState<string[]>(review?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of [...files].slice(0, 3 - photos.length)) {
        const url = await uploadImage(f, `reviews/${userId}`);
        setPhotos((p) => [...p, url].slice(0, 3));
      }
    } catch (e) {
      setErrors((x) => ({ ...x, photos: (e as Error).message }));
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  };

  const submit = () => {
    const next: Record<string, string> = {};
    if (!rating) next.rating = "Choisissez une note de 1 à 5 étoiles.";
    if (body.trim().length < 10) next.body = "Écrivez au moins 10 caractères.";
    if (recommends === null) next.recommends = "Dites-nous si vous recommandez ce produit.";
    setErrors(next);
    if (Object.keys(next).length) return;
    start(async () => {
      const res = await saveProductReview({ product_id: productId, rating, title, body, recommends: recommends!, photos });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        setResult({ ok: false, text: res.error });
        return;
      }
      setResult({ ok: true, text: res.notice });
    });
  };

  if (result?.ok)
    return (
      <div className="space-y-4">
        <Alert tone="ok">{result.text}</Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/compte#avis" className="inline-flex h-11 items-center justify-center rounded-full bg-raised px-5 text-sm font-semibold ring-1 ring-line">
            Voir mes avis
          </Link>
          <Link href={`/produit/${productSlug}`} className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-accent">
            Retour au produit
          </Link>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-5"
    >
      {review?.status === "rejected" && review.reject_reason && <Alert>Avis refusé : {review.reject_reason}. Vous pouvez le modifier et l&apos;envoyer à nouveau.</Alert>}

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-sm font-semibold">Votre note *</legend>
        <div role="radiogroup" aria-label="Note sur 5" className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} étoile${n > 1 ? "s" : ""} : ${labels[n]}`}
              onClick={() => setRating(n)}
              className="grid size-12 place-items-center rounded-full hover:bg-fg/5"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.8l2.83 5.73 6.32.92-4.57 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.85 9.45l6.32-.92L12 2.8z" className={n <= rating ? "fill-gold" : "fill-fg/15"} />
              </svg>
            </button>
          ))}
          <span className="ms-2 text-sm font-semibold text-muted" aria-live="polite">
            {labels[rating]}
          </span>
        </div>
        {errors.rating && <p className="mt-1 text-xs font-medium text-danger">{errors.rating}</p>}
      </fieldset>

      <Field label="Titre (facultatif)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex. Très bon son pour le prix" error={errors.title} />
      <TextareaField
        label="Votre avis *"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={600}
        placeholder="Qualité, autonomie, livraison… ce qui aidera les prochains clients."
        error={errors.body}
        hint={`${body.trim().length} / 600 (10 au moins)`}
      />

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-sm font-semibold">Recommandez-vous ce produit ? *</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [true, "Oui"],
              [false, "Non"],
            ] as const
          ).map(([v, label]) => (
            <label key={label} className={cn("flex min-h-11 cursor-pointer items-center justify-center rounded-2xl font-semibold ring-1", recommends === v ? "bg-accent-soft ring-accent" : "bg-raised/40 ring-line")}>
              <input type="radio" name="recommends" className="sr-only" checked={recommends === v} onChange={() => setRecommends(v)} />
              {label}
            </label>
          ))}
        </div>
        {errors.recommends && <p className="mt-1 text-xs font-medium text-danger">{errors.recommends}</p>}
      </fieldset>

      <div>
        <p className="mb-1.5 text-sm font-semibold">Photos (facultatif, 3 au plus)</p>
        <ul className="flex flex-wrap gap-2">
          {photos.map((src, i) => (
            <li key={src} className="relative size-20 overflow-hidden rounded-xl bg-raised">
              <Image src={src} alt={`Photo ${i + 1}`} fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((x) => x !== src))}
                aria-label={`Retirer la photo ${i + 1}`}
                className="absolute end-1 top-1 grid size-8 place-items-center rounded-full bg-canvas/85"
              >
                <IconClose size={13} />
              </button>
            </li>
          ))}
          {photos.length < 3 && (
            <li>
              <button
                type="button"
                onClick={() => file.current?.click()}
                disabled={uploading}
                className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs font-semibold text-muted hover:border-fg/40"
              >
                {uploading ? <IconSpinner size={18} /> : <IconImage size={20} />}
                {uploading ? "Envoi…" : "Ajouter"}
              </button>
            </li>
          )}
        </ul>
        <input ref={file} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => addPhotos(e.target.files)} />
        <p className={cn("mt-1.5 text-xs", errors.photos ? "font-medium text-danger" : "text-muted")}>{errors.photos ?? "Les photos sont allégées automatiquement."}</p>
      </div>

      {result && !result.ok && <Alert>{result.text}</Alert>}
      <Button type="submit" size="lg" disabled={pending || uploading} className="w-full">
        {pending && <IconSpinner size={18} />}
        {pending ? "Envoi…" : review ? "Mettre à jour mon avis" : "Publier mon avis"}
      </Button>
      <p className="text-center text-xs text-muted">Votre prénom et l&apos;initiale de votre nom s&apos;affichent avec l&apos;avis, jamais votre e-mail ni votre téléphone.</p>
      {review && (
        <button
          type="button"
          onClick={() =>
            start(async () => {
              if (!confirm("Supprimer définitivement votre avis ?")) return;
              const res = await deleteProductReview(review.id);
              setResult(res.ok ? { ok: true, text: res.notice } : { ok: false, text: res.error });
            })
          }
          className="min-h-11 text-sm font-semibold text-danger underline-offset-4 hover:underline"
        >
          Supprimer mon avis
        </button>
      )}
    </form>
  );
}
