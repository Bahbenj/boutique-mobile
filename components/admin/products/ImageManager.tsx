"use client";

import Image from "next/image";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MAX_IMAGES } from "@/lib/admin/schema";
import { uploadImage } from "@/lib/admin/upload";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { IconChevron, IconClose, IconImage, IconPlus, IconSpinner } from "@/components/ui/icons";

type Pending = { id: string; name: string; error?: string };

const PUBLIC_MARK = "/storage/v1/object/public/catalog/";

/**
 * Photos d'un produit : ajout multiple (compressées avant envoi), ordre,
 * photo principale (la 1re), retrait. Une photo ajoutée puis retirée avant
 * enregistrement est aussitôt supprimée du stockage (pas de fichier orphelin).
 */
export function ImageManager({
  images,
  setImages,
  initial,
  error,
}: {
  images: string[];
  setImages: Dispatch<SetStateAction<string[]>>;
  initial: string[];
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const slots = MAX_IMAGES - images.length - pending.filter((p) => !p.error).length;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, Math.max(0, slots));
    const jobs = list.map((file) => ({ id: crypto.randomUUID(), name: file.name, file }));
    setPending((p) => [...p, ...jobs.map(({ id, name }) => ({ id, name }))]);
    // 3 envois en parallèle maximum (connexion mobile)
    const queue = [...jobs];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const current = job;
        try {
          const url = await uploadImage(current.file, "products");
          setImages((imgs) => [...imgs, url]);
          setPending((p) => p.filter((x) => x.id !== current.id));
        } catch (e) {
          setPending((p) => p.map((x) => (x.id === current.id ? { ...x, error: (e as Error).message } : x)));
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (input.current) input.current.value = "";
  };

  const remove = (url: string) => {
    setImages((imgs) => imgs.filter((u) => u !== url));
    // Envoyée pendant cette édition et jamais enregistrée : on la supprime tout de suite
    if (!initial.includes(url) && url.includes(PUBLIC_MARK)) {
      createClient().storage.from("catalog").remove([decodeURIComponent(url.split(PUBLIC_MARK)[1])]);
    }
  };

  const move = (from: number, to: number) =>
    setImages((imgs) => {
      if (to < 0 || to >= imgs.length) return imgs;
      const next = [...imgs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((url, i) => (
          <li key={url} className="group relative aspect-square overflow-hidden rounded-2xl bg-raised">
            <Image src={url} alt={`Photo ${i + 1}`} fill sizes="(min-width: 1024px) 160px, 33vw" className="object-cover" />
            {i === 0 && (
              // En bas à gauche : la flèche « gauche » y est masquée pour la 1re photo
              <span className="pointer-events-none absolute start-1.5 bottom-2.5 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-bold text-on-accent">
                Principale
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label={`Retirer la photo ${i + 1}`}
              className="absolute end-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-canvas/85 text-fg shadow-soft hover:bg-surface"
            >
              <IconClose size={14} />
            </button>
            {images.length > 1 && (
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Déplacer la photo ${i + 1} vers la gauche`}
                  className="grid size-8 place-items-center rounded-full bg-canvas/85 shadow-soft disabled:invisible"
                >
                  <IconChevron dir="left" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === images.length - 1}
                  aria-label={`Déplacer la photo ${i + 1} vers la droite`}
                  className="grid size-8 place-items-center rounded-full bg-canvas/85 shadow-soft disabled:invisible"
                >
                  <IconChevron dir="right" size={16} />
                </button>
              </div>
            )}
          </li>
        ))}

        {pending.map((p) => (
          <li
            key={p.id}
            className={cn(
              "relative grid aspect-square place-items-center rounded-2xl p-2 text-center text-xs",
              p.error ? "bg-danger-soft text-danger" : "skeleton text-muted",
            )}
          >
            {p.error ? (
              <span>
                <span className="block font-semibold">Échec</span>
                <span className="line-clamp-3">{p.error}</span>
                <button type="button" onClick={() => setPending((all) => all.filter((x) => x.id !== p.id))} className="mt-1 font-semibold underline">
                  OK
                </button>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1.5" role="status">
                <IconSpinner size={18} />
                Envoi…
              </span>
            )}
          </li>
        ))}

        {slots > 0 && (
          <li>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-muted transition-colors hover:border-fg/40 hover:text-fg"
            >
              {images.length ? <IconPlus size={20} /> : <IconImage size={22} />}
              {images.length ? "Ajouter" : "Ajouter des photos"}
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => addFiles(e.target.files)}
      />
      <p className={cn("mt-2 text-xs", error ? "font-medium text-danger" : "text-muted")}>
        {error ?? `La 1re photo est la photo principale. ${MAX_IMAGES} maximum, compressées automatiquement.`}
      </p>
    </div>
  );
}
