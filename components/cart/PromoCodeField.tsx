"use client";

import { useState, useTransition } from "react";
import { checkPromoCode } from "@/app/(site)/commande/actions";
import { useCart } from "@/lib/cart-store";
import { codeDiscount, discountLabel } from "@/lib/promo-shared";
import { cn, formatPrice } from "@/lib/utils";
import { IconSpinner, IconTag } from "@/components/ui/icons";

/**
 * Code promo du panier : saisie, vérification par le serveur, puis affichage
 * du code appliqué. La remise est recalculée et le code revérifié en base au
 * moment de la commande (place_order).
 */
export function PromoCodeField({ subtotal, className }: { subtotal: number; className?: string }) {
  const promo = useCart((s) => s.promo);
  const setPromo = useCart((s) => s.setPromo);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (promo) {
    const discount = codeDiscount(subtotal, promo);
    const missing = promo.minOrder - subtotal;
    return (
      <div className={cn("rounded-2xl bg-accent-soft p-3 text-sm ring-1 ring-accent/30", className)}>
        <div className="flex items-center gap-2">
          <IconTag size={16} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="font-bold tracking-wide">{promo.code}</span> <span className="text-muted">{discountLabel(promo.kind, promo.value)}</span>
          </span>
          {discount > 0 && <span className="font-bold whitespace-nowrap tabular-nums">−{formatPrice(discount)}</span>}
          <button type="button" onClick={() => setPromo(null)} className="min-h-9 px-1 font-semibold text-muted underline-offset-4 hover:text-fg hover:underline">
            Retirer
          </button>
        </div>
        {missing > 0 && (
          <p className="mt-1.5 text-muted">
            Encore {formatPrice(missing)} d&apos;articles pour profiter de ce code (minimum {formatPrice(promo.minOrder)}).
          </p>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-fg/80 underline-offset-4 hover:text-fg hover:underline", className)}
      >
        <IconTag size={16} />
        Vous avez un code promo&nbsp;?
      </button>
    );
  }

  const apply = () =>
    start(async () => {
      const res = await checkPromoCode(value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setValue("");
      setOpen(false);
      setPromo(res.code);
    });

  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold" htmlFor="code-promo">
        Code promo
      </label>
      <div className="flex gap-2">
        <input
          id="code-promo"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (value.trim()) apply();
            }
          }}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={30}
          placeholder="Ex. BIENVENUE10"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "code-promo-erreur" : undefined}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-raised px-4 text-[1rem] font-semibold tracking-wide uppercase outline-none placeholder:font-normal placeholder:tracking-normal placeholder:normal-case focus:border-accent focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-danger"
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending || !value.trim()}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-fg px-4 text-sm font-semibold text-canvas disabled:opacity-50"
        >
          {pending && <IconSpinner size={16} />}
          Appliquer
        </button>
      </div>
      {error && (
        <p id="code-promo-erreur" role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
