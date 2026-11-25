import Image from "next/image";
import { cn, formatPrice } from "@/lib/utils";
import { IconImage, IconPlus } from "@/components/ui/icons";

/**
 * Aperçu « comme le client le voit » : même rendu que la carte produit de la
 * boutique (photo, pastilles, prix barré, pourcentage), mis à jour en direct.
 */
export function ProductPreview({
  name,
  brand,
  image,
  imageBg,
  price,
  promoPrice,
  fromPrice,
  isNew,
  tag,
  freeDelivery,
  stock,
  isActive,
}: {
  name: string;
  brand: string;
  image?: string;
  imageBg: string | null;
  price: number | null;
  promoPrice: number | null;
  fromPrice: boolean;
  isNew: boolean;
  tag: string;
  freeDelivery: boolean;
  stock: number;
  isActive: boolean;
}) {
  const validPrice = price != null && !Number.isNaN(price) && price > 0;
  const promo = validPrice && promoPrice != null && !Number.isNaN(promoPrice) && promoPrice < price! ? promoPrice : null;
  const percent = promo != null ? Math.round((1 - promo / price!) * 100) : null;
  const soldOut = stock <= 0;
  const badges = [
    soldOut && { text: "Rupture", cls: "bg-fg text-canvas" },
    !soldOut && isNew && { text: "Nouveau", cls: "bg-gold text-on-gold" },
    !soldOut && percent != null && { text: `−${percent} %`, cls: "bg-gold text-on-gold" },
    !soldOut && percent == null && tag.trim() && { text: tag.trim(), cls: "bg-gold text-on-gold" },
    !soldOut && freeDelivery && { text: "Livraison offerte", cls: "bg-accent text-on-accent" },
  ].filter(Boolean) as { text: string; cls: string }[];

  return (
    <div>
      {!isActive && <p className="mb-2 rounded-xl bg-canvas p-2 text-center text-xs font-semibold text-muted ring-1 ring-fg/10">Masqué : les clients ne le voient pas</p>}
      <article className="flex flex-col">
        <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-raised">
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="256px"
              className={cn(imageBg ? "object-contain p-[6%]" : "object-cover", soldOut && "opacity-50 grayscale")}
              style={imageBg ? { backgroundColor: imageBg } : undefined}
            />
          ) : (
            <span className="grid size-full place-items-center text-center text-sm text-muted">
              <span>
                <IconImage size={28} className="mx-auto" />
                Ajoutez une photo
              </span>
            </span>
          )}
          {badges.length > 0 && (
            <div className="absolute inset-x-2.5 top-2.5 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span key={b.text} className={cn("rounded-full px-3 py-1 text-xs leading-5 font-semibold", b.cls)}>
                  {b.text}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 px-1">
          {brand && <p className="text-xs font-semibold text-muted">{brand}</p>}
          <h3 className="mt-0.5 text-[1.0625rem] leading-snug font-bold tracking-tight">{name || "Nom du produit"}</h3>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            {validPrice ? (
              <>
                <span className="text-lg font-extrabold tabular-nums">
                  {fromPrice && <span className="text-sm font-semibold text-muted">dès </span>}
                  {formatPrice(promo ?? price!)}
                </span>
                {promo != null && <span className="text-sm text-muted tabular-nums line-through">{formatPrice(price!)}</span>}
              </>
            ) : (
              <span className="text-sm font-semibold text-danger">Prix à renseigner</span>
            )}
          </p>
          <span className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-raised text-sm font-semibold ring-1 ring-line">
            <IconPlus size={16} />
            {soldOut ? "Indisponible" : "Ajouter"}
          </span>
        </div>
      </article>
    </div>
  );
}
