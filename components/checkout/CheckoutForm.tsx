"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { governorates, siteConfig, type DeliveryOptionId } from "@/config/site";
import { t } from "@/i18n";
import { cartSubtotal, useCart } from "@/lib/cart-store";
import { deliveryFee, normalizeTnPhone, orderWhatsappMessage } from "@/lib/order";
import { useMounted } from "@/lib/use-mounted";
import { cn, formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconCheck, IconWhatsApp } from "@/components/ui/icons";

type Errors = Partial<Record<"name" | "phone" | "governorate" | "city" | "address", string>>;

/**
 * Formulaire de commande (paiement à la livraison). Envoie le récapitulatif
 * sur WhatsApp. TODO étape admin 4 : enregistrer d'abord la commande côté serveur.
 */
export function CheckoutForm() {
  const mounted = useMounted();
  const { items, clear } = useCart();
  const [delivery, setDelivery] = useState<DeliveryOptionId>("home");
  const [errors, setErrors] = useState<Errors>({});
  const [sentLink, setSentLink] = useState<string | null>(null);

  if (!mounted) return <div className="skeleton h-96 rounded-card" aria-hidden="true" />;

  if (sentLink) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-white p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-accent-ink">
          <IconCheck size={26} strokeWidth={2.5} />
        </span>
        <h2 className="mt-5 text-2xl font-extrabold">{t.checkout.sentTitle}</h2>
        <p className="mt-2 text-muted">{t.checkout.sentText}</p>
        <Button href={sentLink} variant="whatsapp" className="mt-6">
          <IconWhatsApp size={18} />
          {t.checkout.reopenWhatsapp}
        </Button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-white p-8 text-center shadow-soft">
        <p className="text-lg font-semibold">{t.cart.empty}</p>
        <Link href="/boutique" className={buttonClasses("dark", "md", "mt-5")}>
          {t.cart.emptyCta}
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);
  const fee = deliveryFee(delivery, subtotal);
  const option = siteConfig.delivery.options.find((o) => o.id === delivery)!;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const customer = {
      name: get("name"),
      phone: get("phone"),
      governorate: get("governorate"),
      city: get("city"),
      address: get("address"),
      note: get("note") || undefined,
    };
    const next: Errors = {};
    if (customer.name.length < 3) next.name = t.checkout.errors.name;
    if (!normalizeTnPhone(customer.phone)) next.phone = t.checkout.errors.phone;
    if (!customer.governorate) next.governorate = t.checkout.errors.required;
    if (delivery !== "pickup") {
      if (!customer.city) next.city = t.checkout.errors.required;
      if (customer.address.length < 5) next.address = t.checkout.errors.address;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      e.currentTarget.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    const message = orderWhatsappMessage({
      lines: items.map((i) => ({ name: i.name, variant: i.variant, qty: i.qty, price: i.price })),
      customer: delivery === "pickup" ? { ...customer, address: "Retrait en magasin", city: customer.city || "-" } : customer,
      delivery: option.label,
      subtotal,
      fee,
    });
    const link = whatsappLink(message);
    window.open(link, "_blank", "noopener,noreferrer");
    setSentLink(link);
    clear();
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
      <div className="space-y-8">
        <fieldset className="rounded-card bg-white p-5 shadow-soft sm:p-7">
          <legend className="sr-only">{t.checkout.contact}</legend>
          <h2 className="text-xl font-extrabold">{t.checkout.contact}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t.checkout.name} name="name" autoComplete="name" required error={errors.name} />
            <Field
              label={t.checkout.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="XX XXX XXX"
              required
              error={errors.phone}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-card bg-white p-5 shadow-soft sm:p-7">
          <legend className="sr-only">{t.checkout.delivery}</legend>
          <h2 className="text-xl font-extrabold">{t.checkout.delivery}</h2>
          <div className="mt-5 grid gap-2.5">
            {siteConfig.delivery.options.map((o) => {
              const price = deliveryFee(o.id, subtotal);
              return (
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl p-4 ring-1 transition-colors",
                    delivery === o.id ? "bg-accent-soft ring-ink" : "ring-line hover:ring-ink/40",
                  )}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={o.id}
                    checked={delivery === o.id}
                    onChange={() => setDelivery(o.id)}
                    className="size-5 accent-[var(--ink)]"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold">{o.label}</span>
                    <span className="block text-sm text-muted">{o.delay}</span>
                  </span>
                  <span className="font-bold tabular-nums">{price ? formatPrice(price) : t.checkout.free}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SelectField label={t.checkout.governorate} name="governorate" required defaultValue="" error={errors.governorate}>
              <option value="" disabled>
                {t.checkout.choose}
              </option>
              {governorates.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </SelectField>
            <Field label={t.checkout.city} name="city" autoComplete="address-level2" error={errors.city} />
            {delivery !== "pickup" && (
              <Field
                label={t.checkout.address}
                name="address"
                autoComplete="street-address"
                className="sm:col-span-2"
                error={errors.address}
              />
            )}
            <TextareaField label={t.checkout.note} name="note" className="sm:col-span-2" rows={2} />
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-card bg-white p-5 shadow-soft sm:p-7">
          <h2 className="text-xl font-extrabold">{t.checkout.summary}</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-cream-deep">
                  <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />
                  <span className="absolute end-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] font-bold text-cream">
                    {i.qty}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{i.name}</span>
                  {i.variant && <span className="block truncate text-sm text-muted">{i.variant}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.9375rem]">
            <div className="flex justify-between">
              <dt className="text-muted">{t.cart.subtotal}</dt>
              <dd className="font-semibold tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.checkout.delivery}</dt>
              <dd className="font-semibold tabular-nums">{fee ? formatPrice(fee) : t.checkout.free}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-line pt-3">
              <dt className="font-bold">{t.checkout.total}</dt>
              <dd className="text-2xl font-extrabold tracking-tight tabular-nums">{formatPrice(subtotal + fee)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" className="mt-5 w-full">
            {t.checkout.submit}
          </Button>
          <p className="mt-3 text-center text-sm text-muted">{t.cart.codNote}</p>
        </div>
      </aside>
    </form>
  );
}
