"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { t } from "@/i18n";
import { stockState } from "@/lib/product-helpers";
import { priceFor, useAddToCart } from "@/lib/use-add-to-cart";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { IconBag, IconWhatsApp } from "@/components/ui/icons";
import { QtyStepper } from "@/components/cart/QtyStepper";
import { Price } from "./Price";
import { ProductBadges } from "./ProductBadges";
import { useWhatsappLink } from "@/components/layout/StoreInfoProvider";

/** Bloc d'achat de la fiche : badges, prix, couleur, capacité, quantité, ajout. */
export function ProductPurchase({ product: p }: { product: Product }) {
  const waLink = useWhatsappLink();

  const [color, setColor] = useState(p.colors?.[0]?.name);
  const [storage, setStorage] = useState(p.storage?.[0]?.label);
  const [qty, setQty] = useState(1);
  const addToCart = useAddToCart();

  const { price, oldPrice } = priceFor(p, storage);
  const stock = stockState(p.stock);
  const soldOut = stock === "out";

  return (
    <div>
      <ProductBadges product={p} price={price} oldPrice={oldPrice} />
      <Price price={price} oldPrice={oldPrice} size="lg" className="mt-4" />

      {p.colors && p.colors.length > 0 && (
        <fieldset className="mt-7">
          <legend className="text-sm font-semibold">
            {t.product.color} <span className="font-normal text-muted">· {color}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {p.colors.map((c) => (
              <label key={c.name} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={c.name}
                  checked={color === c.name}
                  onChange={() => setColor(c.name)}
                  className="peer sr-only"
                />
                <span className="sr-only">{c.name}</span>
                <span
                  aria-hidden="true"
                  title={c.name}
                  className="block size-10 rounded-full ring-1 ring-fg/15 ring-offset-2 ring-offset-canvas transition-shadow peer-checked:ring-2 peer-checked:ring-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent"
                  style={{ background: c.hex }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {p.storage && p.storage.length > 0 && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">{t.product.storage}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {p.storage.map((s) => (
              <label key={s.label} className="cursor-pointer">
                <input
                  type="radio"
                  name="storage"
                  value={s.label}
                  checked={storage === s.label}
                  onChange={() => setStorage(s.label)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-12 items-center rounded-full px-5 text-sm font-semibold ring-1 transition-colors",
                    "bg-surface ring-line hover:ring-fg/40 peer-checked:bg-accent peer-checked:text-on-accent peer-checked:ring-accent",
                    "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                  )}
                >
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="mt-8 flex gap-2.5">
        {!soldOut && <QtyStepper value={qty} max={p.stock} onChange={setQty} size="md" />}
        <Button
          size="lg"
          className="min-w-0 flex-1 px-4 sm:px-7"
          disabled={soldOut}
          onClick={() => {
            addToCart(p, { color, storage }, qty);
            setQty(1);
          }}
        >
          <IconBag size={20} className="max-[380px]:hidden" />
          {soldOut ? t.product.unavailable : t.product.addToCart}
        </Button>
      </div>

      <p className={cn("mt-3 flex items-center gap-2 text-sm font-medium", stock === "low" ? "text-fg" : "text-muted")}>
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", stock === "out" ? "bg-danger" : stock === "low" ? "bg-gold" : "bg-success")}
        />
        {soldOut ? t.product.outOfStock : stock === "low" ? t.product.lowStockHint(p.stock) : t.product.inStock}
      </p>

      <Button
        href={waLink(t.product.whatsappAbout([p.name, color, storage].filter(Boolean).join(" · ")))}
        variant="outline"
        size="md"
        className="mt-6 w-full"
      >
        <IconWhatsApp size={18} />
        {t.product.askWhatsapp}
      </Button>
    </div>
  );
}
