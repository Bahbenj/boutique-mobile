"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MAX_IMAGES } from "@/lib/admin/schema";
import { uploadImage } from "@/lib/admin/upload";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { IconClose, IconImage, IconPlus, IconSpinner } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

type Pending = { id: string; name: string; error?: string };

const PUBLIC_MARK = "/storage/v1/object/public/catalog/";

/**
 * Photos d'un produit :
 *  - ajout depuis la galerie, l'appareil photo du téléphone ou par glisser-déposer
 *    (ordinateur) ; chaque photo est compressée et convertie en WebP avant l'envoi ;
 *  - ordre par glisser-déposer (poignée ⠿, au doigt ou à la souris) ou au clavier
 *    (flèches) ; la 1re photo est la photo principale ;
 *  - retrait avec confirmation. Une photo ajoutée puis retirée avant
 *    l'enregistrement est aussitôt supprimée du stockage (pas de fichier orphelin).
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
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dropping, setDropping] = useState(false);
  const [toRemove, setToRemove] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const slots = MAX_IMAGES - images.length - pending.filter((p) => !p.error).length;

  const addFiles = async (files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, Math.max(0, slots));
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
    if (gallery.current) gallery.current.value = "";
    if (camera.current) camera.current.value = "";
  };

  const remove = (url: string) => {
    setImages((imgs) => imgs.filter((u) => u !== url));
    // Envoyée pendant cette édition et jamais enregistrée : supprimée tout de suite
    if (!initial.includes(url) && url.includes(PUBLIC_MARK)) {
      createClient().storage.from("catalog").remove([decodeURIComponent(url.split(PUBLIC_MARK)[1])]);
    }
  };

  const move = (from: number, to: number) =>
    setImages((imgs) => {
      if (to < 0 || to >= imgs.length || from === to) return imgs;
      const next = [...imgs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  // Glisser-déposer au doigt ou à la souris : la photo suit la tuile survolée
  const dragIndex = useRef<number | null>(null);
  useEffect(() => {
    if (dragFrom === null) return;
    dragIndex.current = dragFrom;
    const onMove = (e: PointerEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-photo-index]");
      if (!target) return;
      const to = Number(target.dataset.photoIndex);
      if (dragIndex.current !== null && to !== dragIndex.current) {
        move(dragIndex.current, to);
        dragIndex.current = to;
        setDragFrom(to);
      }
    };
    const onUp = () => {
      dragIndex.current = null;
      setDragFrom(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    window.addEventListener("pointercancel", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // move ne dépend que de setImages (stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragFrom === null]);

  return (
    <div
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes("Files")) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        addFiles(e.dataTransfer.files);
      }}
      className={cn("rounded-2xl transition-shadow", dropping && "ring-2 ring-accent ring-offset-4 ring-offset-surface")}
    >
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((url, i) => (
          <li
            key={url}
            data-photo-index={i}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-2xl bg-raised transition-[transform,box-shadow]",
              dragFrom === i && "z-10 scale-105 shadow-lift ring-2 ring-accent",
            )}
          >
            <Image src={url} alt={`Photo ${i + 1}`} fill sizes="(min-width: 1024px) 160px, 33vw" className="pointer-events-none object-cover" />
            {i === 0 && (
              <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 rounded-full bg-accent px-2 py-0.5 text-center text-[0.65rem] font-bold text-on-accent">
                Principale
              </span>
            )}
            <button
              type="button"
              onClick={() => setToRemove(url)}
              aria-label={`Retirer la photo ${i + 1}`}
              className="absolute end-1 top-1 grid size-9 place-items-center rounded-full bg-canvas/85 text-fg shadow-soft hover:bg-surface"
            >
              <IconClose size={14} />
            </button>
            {images.length > 1 && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragFrom(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                    e.preventDefault();
                    move(i, i - 1);
                  }
                  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                    e.preventDefault();
                    move(i, i + 1);
                  }
                }}
                aria-label={`Déplacer la photo ${i + 1} (glisser, ou flèches du clavier)`}
                title="Glisser pour changer l'ordre"
                className="absolute start-1 top-1 grid size-9 cursor-grab touch-none place-items-center rounded-full bg-canvas/85 text-base leading-none text-fg shadow-soft active:cursor-grabbing"
              >
                <span aria-hidden="true">⠿</span>
              </button>
            )}
          </li>
        ))}

        {pending.map((p) => (
          <li
            key={p.id}
            className={cn("relative grid aspect-square place-items-center rounded-2xl p-2 text-center text-xs", p.error ? "bg-danger-soft text-danger" : "skeleton text-muted")}
          >
            {p.error ? (
              <span>
                <span className="block font-semibold">Échec</span>
                <span className="line-clamp-3">{p.error}</span>
                <button type="button" onClick={() => setPending((all) => all.filter((x) => x.id !== p.id))} className="mt-1 min-h-8 font-semibold underline">
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
              onClick={() => gallery.current?.click()}
              className={cn(
                "flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-sm font-semibold transition-colors hover:border-fg/40 hover:text-fg",
                error ? "border-danger text-danger" : "border-line text-muted",
              )}
              data-invalid={error ? true : undefined}
            >
              {images.length ? <IconPlus size={20} /> : <IconImage size={22} />}
              <span className="px-1">{images.length ? "Ajouter" : "Ajouter des photos"}</span>
            </button>
          </li>
        )}
      </ul>

      {slots > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="light" className="h-11 lg:hidden" onClick={() => camera.current?.click()}>
            Prendre une photo
          </Button>
          <Button variant="light" className="h-11" onClick={() => gallery.current?.click()}>
            Choisir dans la galerie
          </Button>
        </div>
      )}

      <input ref={gallery} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => addFiles(e.target.files)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => addFiles(e.target.files)} />

      <p className={cn("mt-2 text-xs", error ? "font-medium text-danger" : "text-muted")}>
        {error ??
          `Glissez la poignée ⠿ pour changer l'ordre. ${MAX_IMAGES} photos maximum, allégées automatiquement.${" "}Sur ordinateur, vous pouvez aussi déposer les fichiers ici.`}
      </p>

      <Modal open={toRemove !== null} onClose={() => setToRemove(null)} title="Retirer cette photo ?">
        {toRemove && (
          <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-2xl bg-raised">
            <Image src={toRemove} alt="" fill sizes="160px" className="object-cover" />
          </div>
        )}
        <p className="mt-3 text-center text-sm text-muted">Elle disparaîtra du produit à l&apos;enregistrement.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="light" onClick={() => setToRemove(null)}>
            Garder
          </Button>
          <Button
            className="bg-danger text-canvas hover:brightness-110"
            onClick={() => {
              if (toRemove) remove(toRemove);
              setToRemove(null);
            }}
          >
            Retirer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
