"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteCategory, reorderCategories, saveCategory, setCategoryActive } from "@/app/admin/(panel)/categories/actions";
import { categorySchema, fieldErrors, slugify, type DbCategory } from "@/lib/admin/schema";
import { uploadImage } from "@/lib/admin/upload";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { IconImage, IconPencil, IconPlus, IconSpinner, IconTrash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog, IconButton, Switch } from "../ui";

type Category = DbCategory & { productCount: number };

/**
 * Catégories : ordre du menu par glisser-déposer (poignée ⠿, au doigt ou à la
 * souris, ou flèches du clavier), masquage avec « Annuler », création,
 * modification, suppression des catégories vides seulement.
 */
export function CategoryManager({ categories }: { categories: Category[] }) {
  const toast = useUI((s) => s.showToast);
  const [order, setOrder] = useState(categories.map((c) => c.id));
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [synced, setSynced] = useState(categories);
  const [editing, setEditing] = useState<string | null>(null); // id ou "new"
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pendingOrder, startOrder] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  // Nouvelles données serveur (après création, suppression, masquage) : on resynchronise
  if (synced !== categories) {
    setSynced(categories);
    setOrder(categories.map((c) => c.id));
    setActive({});
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  const list = order.map((id) => byId.get(id)).filter(Boolean) as Category[];
  const isActive = (c: Category) => active[c.id] ?? c.is_active;

  const saveOrder = (next: string[], previous: string[]) => {
    if (next.join() === previous.join()) return;
    startOrder(async () => {
      const res = await reorderCategories(next);
      if (!res.ok) {
        setOrder(previous);
        toast({ title: "Ordre non enregistré", text: res.error, tone: "error" });
      }
    });
  };

  const moveTo = (ids: string[], from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return ids;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  // Glisser-déposer : la catégorie suit la ligne survolée, l'ordre est enregistré au lâcher
  const orderRef = useRef(order);
  const startRef = useRef<string[]>([]);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);
  useEffect(() => {
    if (!dragId) return;
    startRef.current = orderRef.current;
    const onMove = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-cat-id]");
      if (!target || target.dataset.catId === dragId) return;
      const ids = orderRef.current;
      const next = moveTo(ids, ids.indexOf(dragId), ids.indexOf(target.dataset.catId!));
      orderRef.current = next;
      setOrder(next);
    };
    const onUp = () => {
      setDragId(null);
      saveOrder(orderRef.current, startRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // saveOrder ne dépend que de setters stables
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragId]);

  const toggle = (c: Category, value: boolean, undo = true) => {
    setActive((a) => ({ ...a, [c.id]: value }));
    startOrder(async () => {
      const res = await setCategoryActive(c.id, value);
      if (!res.ok) {
        setActive((a) => ({ ...a, [c.id]: !value }));
        toast({ title: "Pas enregistré", text: res.error, tone: "error" });
        return;
      }
      toast({
        title: value ? "Catégorie visible sur le site" : "Catégorie masquée",
        text: value ? c.name : `${c.name} et ses produits n'apparaissent plus sur le site.`,
        action: undo ? { label: "Annuler", onClick: () => toggle(c, !value, false) } : undefined,
      });
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          L&apos;ordre ci-dessous est celui du menu de la boutique. Glissez la poignée <span aria-hidden="true">⠿</span> pour le changer. Une catégorie{" "}
          <strong className="text-fg">masquée</strong> disparaît du site avec ses produits, sans rien effacer.
          {pendingOrder && (
            <span className="ms-2 inline-flex items-center gap-1 font-semibold text-fg" role="status">
              <IconSpinner size={14} /> Enregistrement…
            </span>
          )}
        </p>
        {editing !== "new" && (
          <Button onClick={() => setEditing("new")} className="max-sm:w-full">
            <IconPlus size={18} />
            Nouvelle catégorie
          </Button>
        )}
      </div>

      {editing === "new" && (
        <div className="mb-4 rounded-card bg-surface p-4 shadow-soft sm:p-5">
          <h2 className="mb-4 text-lg font-extrabold">Nouvelle catégorie</h2>
          <CategoryForm category={null} onDone={() => setEditing(null)} />
        </div>
      )}

      {list.length === 0 && editing !== "new" ? (
        <div className="rounded-card bg-surface p-8 text-center shadow-soft">
          <p className="font-semibold">Aucune catégorie pour l&apos;instant.</p>
          <p className="mt-1 text-sm text-muted">Créez-en une (par exemple « Smartphones ») pour ranger vos produits.</p>
        </div>
      ) : (
        <ol className="space-y-3">
          {list.map((c, i) => {
            const visible = isActive(c);
            return (
              <li
                key={c.id}
                data-cat-id={c.id}
                className={cn(
                  "rounded-card bg-surface p-3 shadow-soft transition-[transform,box-shadow] sm:p-4",
                  dragId === c.id && "relative z-10 scale-[1.02] shadow-lift ring-2 ring-accent",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      if (list.length < 2) return;
                      e.preventDefault();
                      setDragId(c.id);
                    }}
                    onKeyDown={(e) => {
                      const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                      if (!dir) return;
                      e.preventDefault();
                      const next = moveTo(order, i, i + dir);
                      setOrder(next);
                      saveOrder(next, order);
                    }}
                    aria-label={`Déplacer ${c.name} (glisser, ou flèches haut et bas)`}
                    title="Glisser pour changer l'ordre"
                    className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-lg leading-none text-muted hover:bg-fg/5 hover:text-fg active:cursor-grabbing"
                  >
                    <span aria-hidden="true">⠿</span>
                  </button>
                  <span className={cn("relative size-12 shrink-0 overflow-hidden rounded-xl bg-raised sm:size-14 sm:rounded-2xl", !visible && "opacity-50")}>
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
                      <span className="me-1.5 text-xs font-semibold text-muted tabular-nums">{i + 1}.</span>
                      {c.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      {!visible && <span className="rounded-full bg-canvas px-2 py-0.5 font-semibold ring-1 ring-fg/15">Masquée</span>}
                      <Link href={`/admin/produits?categorie=${c.id}`} className="inline-flex min-h-6 items-center font-semibold hover:text-fg hover:underline">
                        {c.productCount ? `${c.productCount} produit${c.productCount > 1 ? "s" : ""}` : "Aucun produit"}
                      </Link>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 border-line max-sm:mt-1 max-sm:w-full max-sm:justify-between max-sm:border-t max-sm:pt-2">
                    <span className="sm:me-2 sm:min-w-44">
                      <Switch checked={visible} onChange={(v) => toggle(c, v)} label={visible ? "Visible sur le site" : "Masquée"} showLabel />
                    </span>
                    <span className="flex items-center">
                      <IconButton label={`Modifier ${c.name}`} onClick={() => setEditing(editing === c.id ? null : c.id)} aria-expanded={editing === c.id} className="size-11">
                        <IconPencil size={18} />
                      </IconButton>
                      <IconButton label={`Supprimer ${c.name}`} tone="danger" onClick={() => setToDelete(c)} className="size-11">
                        <IconTrash size={18} />
                      </IconButton>
                    </span>
                  </div>
                </div>
                {editing === c.id && (
                  <div className="mt-4 border-t border-line pt-4">
                    <CategoryForm category={c} onDone={() => setEditing(null)} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Catégorie vide : confirmation simple */}
      <ConfirmDialog
        open={Boolean(toDelete && toDelete.productCount === 0)}
        title="Supprimer cette catégorie ?"
        confirmLabel="Supprimer"
        pending={pendingDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() =>
          startDelete(async () => {
            if (!toDelete) return;
            const res = await deleteCategory(toDelete.id);
            toast(res.ok ? { title: "Catégorie supprimée", text: toDelete.name } : { title: "Suppression impossible", text: res.error, tone: "error" });
            setToDelete(null);
          })
        }
      >
        <p>
          La catégorie <strong className="text-fg">{toDelete?.name}</strong> est vide : elle sera supprimée définitivement.
        </p>
      </ConfirmDialog>

      {/* Catégorie avec des produits : suppression impossible, on explique quoi faire */}
      <Modal open={Boolean(toDelete && toDelete.productCount > 0)} onClose={() => setToDelete(null)} title="Cette catégorie contient des produits">
        {toDelete && (
          <>
            <p className="text-sm text-muted">
              « <strong className="text-fg">{toDelete.name}</strong> » contient {toDelete.productCount} produit{toDelete.productCount > 1 ? "s" : ""}. Pour la supprimer,
              déplacez d&apos;abord ses produits dans une autre catégorie (liste des produits → cochez-les → <strong className="text-fg">Catégorie…</strong>).
            </p>
            <p className="mt-2 text-sm text-muted">Pour simplement la retirer du site, masquez-la : rien n&apos;est effacé.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="light" onClick={() => setToDelete(null)}>
                Fermer
              </Button>
              <Link
                href={`/admin/produits?categorie=${toDelete.id}`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-raised px-5 text-sm font-semibold ring-1 ring-line hover:bg-fg/5"
              >
                Voir ses produits
              </Link>
              {isActive(toDelete) && (
                <Button
                  onClick={() => {
                    toggle(toDelete, false);
                    setToDelete(null);
                  }}
                >
                  Masquer la catégorie
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
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
      toast({ title: "Photo non envoyée", text: (err as Error).message, tone: "error" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = () => {
    const input = { id: category?.id, name, slug: slug || slugify(name), description, image };
    const check = categorySchema.safeParse(input);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    startTransition(async () => {
      const res = await saveCategory(input);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Pas enregistré", text: res.error, tone: "error" });
        return;
      }
      toast({ title: category ? "Catégorie enregistrée" : "Catégorie créée", text: name });
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
      className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]"
    >
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Photo (facultative)</span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={cn(
            "relative grid aspect-square w-28 place-items-center overflow-hidden rounded-2xl text-sm font-semibold text-muted sm:w-full",
            image ? "bg-raised" : "border-2 border-dashed border-line hover:border-fg/40",
          )}
          aria-label={image ? "Changer la photo" : "Ajouter une photo"}
        >
          {image && <Image src={image} alt="" fill sizes="128px" className="object-cover" />}
          {uploading ? <IconSpinner size={20} /> : !image && <IconImage size={22} />}
        </button>
        {image && (
          <button type="button" onClick={() => setImage(null)} className="mt-1 min-h-8 text-xs font-semibold text-muted underline hover:text-fg">
            Retirer la photo
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      <div className="grid gap-4">
        <Field
          label="Nom *"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          error={errors.name}
          hint="Tel qu'il apparaît dans le menu de la boutique."
          required
          autoFocus={!category}
        />
        <TextareaField label="Description courte" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300} />
        <details className="group rounded-2xl bg-raised/50 px-4 py-2 ring-1 ring-line" open={Boolean(errors.slug)}>
          <summary className="flex min-h-10 cursor-pointer items-center text-sm font-semibold">Plus d&apos;options</summary>
          <div className="pt-2 pb-2">
            <Field
              label="Adresse de la page"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value) || e.target.value.toLowerCase());
              }}
              error={errors.slug}
              hint={<>Remplie automatiquement : /boutique/{slug || "…"}</>}
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        </details>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || uploading} className="max-sm:flex-1">
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
