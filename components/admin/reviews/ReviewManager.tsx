"use client";

import { useState, useTransition } from "react";
import { deleteReview, saveReview, setReviewPublished } from "@/app/admin/(panel)/avis/actions";
import { fieldErrors } from "@/lib/admin/schema";
import { reviewSchema, type DbReview, type ReviewInput } from "@/lib/admin/settings-schema";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconPencil, IconPlus, IconStar, IconTrash } from "@/components/ui/icons";
import { ConfirmDialog, IconButton, Switch } from "../ui";

/** Avis clients affichés sur l'accueil : seuls les avis publiés sont visibles. */
export function ReviewManager({ reviews }: { reviews: DbReview[] }) {
  const toast = useUI((s) => s.showToast);
  const [editing, setEditing] = useState<string | null>(null); // id ou "new"
  const [toDelete, setToDelete] = useState<DbReview | null>(null);
  const [pendingDelete, startDelete] = useTransition();
  const [, startToggle] = useTransition();

  const toggle = (r: DbReview, published: boolean) =>
    startToggle(async () => {
      const res = await setReviewPublished(r.id, published);
      if (!res.ok) toast({ title: "Non modifié", text: res.error });
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Saisissez de vrais avis de clients (Google, Facebook, WhatsApp), avec leur accord. La section « Avis » de l&apos;accueil
          n&apos;apparaît que s&apos;il y a au moins un avis publié.
        </p>
        {editing !== "new" && (
          <Button onClick={() => setEditing("new")}>
            <IconPlus size={18} />
            Nouvel avis
          </Button>
        )}
      </div>

      {editing === "new" && (
        <div className="mb-4 rounded-card bg-surface p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-extrabold">Nouvel avis</h2>
          <ReviewForm review={null} onDone={() => setEditing(null)} />
        </div>
      )}

      {reviews.length === 0 && editing !== "new" ? (
        <p className="rounded-card bg-surface p-8 text-center font-semibold shadow-soft">Aucun avis pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className={cn("rounded-card bg-surface p-4 shadow-soft sm:p-5", !r.is_published && "opacity-70")}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex gap-0.5 text-gold" aria-label={`Note : ${r.rating} sur 5`}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <IconStar key={s} size={14} filled={s < r.rating} />
                    ))}
                  </p>
                  <p className="mt-2 line-clamp-3 leading-relaxed">« {r.text} »</p>
                  <p className="mt-2 text-sm">
                    <span className="font-bold">{r.name}</span>
                    {r.city && <span className="text-muted"> · {r.city}</span>}
                    {r.product && <span className="text-muted"> · {r.product}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Switch checked={r.is_published} onChange={(v) => toggle(r, v)} label={`Publier l'avis de ${r.name}`} />
                  <IconButton label={`Modifier l'avis de ${r.name}`} onClick={() => setEditing(editing === r.id ? null : r.id)} aria-expanded={editing === r.id}>
                    <IconPencil size={18} />
                  </IconButton>
                  <IconButton label={`Supprimer l'avis de ${r.name}`} tone="danger" onClick={() => setToDelete(r)}>
                    <IconTrash size={18} />
                  </IconButton>
                </div>
              </div>
              {editing === r.id && (
                <div className="mt-4 border-t border-line pt-4">
                  <ReviewForm review={r} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cet avis ?"
        confirmLabel="Supprimer"
        pending={pendingDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          startDelete(async () => {
            if (!toDelete) return;
            const res = await deleteReview(toDelete.id);
            toast(res.ok ? { title: "Avis supprimé", text: toDelete.name } : { title: "Suppression impossible", text: res.error });
            setToDelete(null);
          })
        }
      >
        <p>
          L&apos;avis de <strong className="text-fg">{toDelete?.name}</strong> sera définitivement supprimé. Pour le masquer
          sans le perdre, dépubliez-le plutôt.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function ReviewForm({ review, onDone }: { review: DbReview | null; onDone: () => void }) {
  const toast = useUI((s) => s.showToast);
  const [form, setForm] = useState<ReviewInput>({
    id: review?.id,
    name: review?.name ?? "",
    city: review?.city ?? "",
    rating: review?.rating ?? 5,
    text: review?.text ?? "",
    product: review?.product ?? "",
    is_published: review?.is_published ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<ReviewInput>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    const check = reviewSchema.safeParse(form);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    startTransition(async () => {
      const res = await saveReview(form);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Non enregistré", text: res.error });
        return;
      }
      toast({ title: review ? "Avis modifié" : "Avis ajouté", text: form.name });
      onDone();
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom du client" value={form.name} placeholder="Ex. Moussa T." onChange={(e) => set({ name: e.target.value })} error={errors.name} />
      <Field label="Ville ou quartier" value={form.city} placeholder="Ex. Bamako" onChange={(e) => set({ city: e.target.value })} error={errors.city} />
      <SelectField label="Note" value={String(form.rating)} onChange={(e) => set({ rating: Number(e.target.value) })} error={errors.rating}>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} étoile{n > 1 ? "s" : ""}
          </option>
        ))}
      </SelectField>
      <Field
        label="Produit ou service (facultatif)"
        value={form.product ?? ""}
        placeholder="Ex. Tecno Camon 30, réparation d'écran"
        onChange={(e) => set({ product: e.target.value })}
        error={errors.product}
      />
      <TextareaField label="Avis" value={form.text} rows={3} onChange={(e) => set({ text: e.target.value })} className="sm:col-span-2" />
      {errors.text && <p className="-mt-3 text-xs font-medium text-danger sm:col-span-2">{errors.text}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
        <Switch checked={form.is_published} onChange={(v) => set({ is_published: v })} label="Publié sur le site" showLabel />
        <div className="flex gap-2">
          <Button variant="light" onClick={onDone}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
