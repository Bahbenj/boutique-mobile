"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteCategory, reorderCategories, saveCategory } from "@/app/admin/(panel)/categories/actions";
import { categorySchema, fieldErrors, slugify, type DbCategory } from "@/lib/admin/schema";
import { uploadImage } from "@/lib/admin/upload";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { IconChevron, IconImage, IconPencil, IconPlus, IconSpinner, IconTrash } from "@/components/ui/icons";
import { ConfirmDialog, IconButton } from "../ui";

type Category = DbCategory & { productCount: number };

/** Liste des catégories : ordre d'affichage, création, modification, suppression. */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const toast = useUI((s) => s.showToast);
  const [order, setOrder] = useState(categories.map((c) => c.id));
  const [synced, setSynced] = useState(categories);
  const [editing, setEditing] = useState<string | null>(null); // id ou "new"
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [pendingOrder, startOrder] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  // Nouvelles données serveur (après création / suppression) : on resynchronise l'ordre
  if (synced !== categories) {
    setSynced(categories);
    setOrder(categories.map((c) => c.id));
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  const list = order.map((id) => byId.get(id)).filter(Boolean) as Category[];

  const move = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const previous = order;
    setOrder(next);
    startOrder(async () => {
      const res = await reorderCategories(next);
      if (!res.ok) {
        setOrder(previous);
        toast({ title: "Ordre non enregistré", text: res.error });
      }
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          L&apos;ordre ci-dessous est celui du site (menu de la boutique, page d&apos;accueil).
          {pendingOrder && (
            <span className="ms-2 inline-flex items-center gap-1 font-semibold text-ink" role="status">
              <IconSpinner size={14} /> Enregistrement…
            </span>
          )}
        </p>
        {editing !== "new" && (
          <Button onClick={() => setEditing("new")}>
            <IconPlus size={18} />
            Nouvelle catégorie
          </Button>
        )}
      </div>

      {editing === "new" && (
        <div className="mb-4 rounded-card bg-white p-5 shadow-soft">
          <h2 className="mb-4 text-lg font-extrabold">Nouvelle catégorie</h2>
          <CategoryForm category={null} onDone={() => setEditing(null)} />
        </div>
      )}

      {list.length === 0 && editing !== "new" ? (
        <p className="rounded-card bg-white p-8 text-center font-semibold shadow-soft">Aucune catégorie pour l&apos;instant.</p>
      ) : (
        <ol className="space-y-3">
          {list.map((c, i) => (
            <li key={c.id} className="rounded-card bg-white p-3 shadow-soft sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex shrink-0 flex-col">
                  <IconButton label={`Monter ${c.name}`} disabled={i === 0 || pendingOrder} onClick={() => move(i, -1)} className="size-9">
                    <IconChevron dir="up" size={16} />
                  </IconButton>
                  <IconButton label={`Descendre ${c.name}`} disabled={i === list.length - 1 || pendingOrder} onClick={() => move(i, 1)} className="size-9">
                    <IconChevron dir="down" size={16} />
                  </IconButton>
                </div>
                <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-cream-deep sm:size-14 sm:rounded-2xl">
                  {c.image ? (
                    <Image src={c.image} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-muted">
                      <IconImage size={20} />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 leading-snug font-bold">
                    <span className="me-1.5 hidden text-xs font-semibold text-muted tabular-nums sm:inline">{i + 1}.</span>
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    <span className="hidden sm:inline">/boutique/{c.slug} · </span>
                    <Link href={`/admin/produits?categorie=${c.id}`} className="font-semibold hover:text-ink hover:underline">
                      {c.productCount} produit{c.productCount > 1 ? "s" : ""}
                    </Link>
                  </p>
                </div>
                <IconButton label={`Modifier ${c.name}`} onClick={() => setEditing(editing === c.id ? null : c.id)} aria-expanded={editing === c.id}>
                  <IconPencil size={18} />
                </IconButton>
                <IconButton label={`Supprimer ${c.name}`} tone="danger" onClick={() => setToDelete(c)}>
                  <IconTrash size={18} />
                </IconButton>
              </div>
              {editing === c.id && (
                <div className="mt-4 border-t border-line pt-4">
                  <CategoryForm category={c} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer cette catégorie ?"
        confirmLabel="Supprimer"
        pending={pendingDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          startDelete(async () => {
            if (!toDelete) return;
            const res = await deleteCategory(toDelete.id);
            toast(res.ok ? { title: "Catégorie supprimée", text: toDelete.name } : { title: "Suppression impossible", text: res.error });
            setToDelete(null);
          })
        }
      >
        <p>
          La catégorie <strong className="text-ink">{toDelete?.name}</strong> sera supprimée.
        </p>
        {toDelete && toDelete.productCount > 0 && (
          <p className="mt-2 rounded-2xl bg-accent-soft p-3 text-ink">
            Ses {toDelete.productCount} produit{toDelete.productCount > 1 ? "s" : ""} ne seront pas supprimés : ils passeront « sans catégorie ».
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const toast = useUI((s) => s.showToast);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [description, setDescription] = useState(category?.description ?? "");
  const [image, setImage] = useState<string | null>(category?.image ?? null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      setImage(await uploadImage(file, "categories"));
    } catch (err) {
      toast({ title: "Photo non envoyée", text: (err as Error).message });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = () => {
    const input = { id: category?.id, name, slug, description, image };
    const check = categorySchema.safeParse(input);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    startTransition(async () => {
      const res = await saveCategory(input);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Non enregistré", text: res.error });
        return;
      }
      toast({ title: category ? "Catégorie modifiée" : "Catégorie créée", text: name });
      onDone();
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
      className="grid gap-4 sm:grid-cols-[8rem_1fr]"
    >
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Photo</span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={cn(
            "relative grid aspect-square w-28 place-items-center overflow-hidden rounded-2xl text-sm font-semibold text-muted sm:w-full",
            image ? "bg-cream-deep" : "border-2 border-dashed border-line hover:border-ink/40",
          )}
          aria-label={image ? "Changer la photo" : "Ajouter une photo"}
        >
          {image && <Image src={image} alt="" fill sizes="128px" className="object-cover" />}
          {uploading ? <IconSpinner size={20} /> : !image && <IconImage size={22} />}
        </button>
        {image && (
          <button type="button" onClick={() => setImage(null)} className="mt-1 text-xs font-semibold text-muted underline hover:text-ink">
            Retirer
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      <div className="grid gap-4">
        <Field
          label="Nom"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          error={errors.name}
          required
          autoFocus={!category}
        />
        <Field
          label="Lien"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value) || e.target.value.toLowerCase());
          }}
          error={errors.slug}
          hint={<>Adresse : /boutique/{slug || "…"}</>}
          autoCapitalize="off"
          spellCheck={false}
        />
        <TextareaField label="Description courte" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || uploading}>
            {pending ? "Enregistrement…" : category ? "Enregistrer" : "Créer la catégorie"}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Annuler
          </Button>
        </div>
      </div>
    </form>
  );
}
