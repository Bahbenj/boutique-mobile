"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/data/products";
import { imageBg, imageFit } from "@/lib/product-helpers";
import { cn } from "@/lib/utils";

/** Galerie de la fiche : grand visuel + vignettes (si plusieurs photos). */
export function ProductGallery({ images, soldOut, imageBg: bg }: { images: ProductImage[]; soldOut?: boolean; imageBg?: string }) {
  const look = { imageBg: bg };
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];

  return (
    <div className="lg:sticky lg:top-28">
      <div className="relative aspect-square overflow-hidden rounded-card-lg bg-raised sm:aspect-[5/4] lg:aspect-square">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          // 1re photo = image principale de la page : chargée tout de suite, en priorité
          loading={index === 0 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : undefined}
          sizes="(min-width: 1024px) 50vw, 100vw"
          quality={75}
          style={imageBg(look)}
          className={cn(imageFit(look), soldOut && "opacity-60 grayscale")}
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2" aria-label="Photos du produit">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1} : ${img.alt}`}
                aria-current={i === index || undefined}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-2xl bg-raised ring-2 transition-[box-shadow] sm:size-20",
                  i === index ? "ring-fg" : "ring-transparent hover:ring-line",
                )}
              >
                <Image src={img.src} alt="" fill sizes="80px" style={imageBg(look)} className={imageFit(look)} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
