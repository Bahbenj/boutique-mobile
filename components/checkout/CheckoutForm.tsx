"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { PaymentMethod } from "@/config/site";
import { t } from "@/i18n";
import { cartSubtotal, useCart } from "@/lib/cart-store";
import { money, newEventId, track } from "@/lib/meta-pixel";
import { deliveryFee, orderWhatsappMessage, type DeliveryMode } from "@/lib/order";
import { normalizeMlPhone, phoneHint, phonePlaceholder } from "@/lib/phone";
import type { CheckoutSettings } from "@/lib/storefront";
import { useMounted } from "@/lib/use-mounted";
import { cn, formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconCash, IconCheck, IconWhatsApp } from "@/components/ui/icons";

type Errors = Partial<Record<"name" | "phone" | "region" | "city" | "address", string>>;

/**
 * Formulaire de commande. Envoie le récapitulatif sur WhatsApp.
 * Zones, frais, retrait et modes de paiement viennent des réglages de
 * l'admin (lib/storefront.ts), avec repli sur config/site.ts.
 * TODO étape admin 4 : enregistrer d'abord la commande côté serveur
 * (place_order recalcule prix, frais de zone et valide le paiement).
 */
export function CheckoutForm({ settings }: { settings: CheckoutSettings }) {
  const { zones, payments, freeFrom, pickup } = settings;
  const mounted = useMounted();
  const { items, clear } = useCart();
  const [mode, setMode] = useState<DeliveryMode>(zones.length || !pickup.enabled ? "home" : "pickup");
  const [zoneId, setZoneId] = useState("");
  const [payment, setPayment] = useState<PaymentMethod["id"]>(payments[0]?.id ?? "cod");
  const [errors, setErrors] = useState<Errors>({});
  const [sentLink, setSentLink] = useState<string | null>(null);
  const checkoutTracked = useRef(false);

  const subtotal = cartSubtotal(items);

  // Meta Pixel : une fois par visite de la page, quand le panier est chargé
  useEffect(() => {
    if (!mounted || checkoutTracked.current || !items.length) return;
    checkoutTracked.current = true;
    track("InitiateCheckout", {
      content_ids: items.map((i) => i.slug),
      contents: items.map((i) => ({ id: i.slug, quantity: i.qty })),
      content_type: "product",
      num_items: items.reduce((n, i) => n + i.qty, 0),
      ...money(subtotal),
    });
  }, [mounted, items, subtotal]);

  if (!mounted) return <div className="skeleton h-96 rounded-card" aria-hidden="true" />;

  if (sentLink) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center shadow-soft">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success text-canvas">
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
      <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center shadow-soft">
        <p className="text-lg font-semibold">{t.cart.empty}</p>
        <Link href="/boutique" className={buttonClasses("primary", "md", "mt-5")}>
          {t.cart.emptyCta}
        </Link>
      </div>
    );
  }

  const zone = zones.find((z) => z.id === zoneId);
  const offered = items.some((i) => i.freeDelivery);
  const fee = deliveryFee(mode, zone, subtotal, freeFrom, offered);
  const selectedPayment = payments.find((m) => m.id === payment);
  const zoneGroups = [
    { label: "District de Bamako", zones: zones.filter((z) => z.group === "bamako") },
    { label: "Régions", zones: zones.filter((z) => z.group === "region") },
  ].filter((g) => g.zones.length);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const phone = normalizeMlPhone(get("phone"));
    const next: Errors = {};
    if (get("name").length < 3) next.name = t.checkout.errors.name;
    if (!phone) next.phone = t.checkout.errors.phone;
    if (mode === "home") {
      if (!zone) next.region = t.checkout.errors.required;
      if (get("address").length < 5) next.address = t.checkout.errors.address;
    }
    setErrors(next);
    if (Object.keys(next).length || !phone) {
      e.currentTarget.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    const message = orderWhatsappMessage({
      lines: items.map((i) => ({ name: i.name, variant: i.variant, qty: i.qty, price: i.price })),
      customer: {
        name: get("name"),
        phone,
        region: mode === "pickup" ? pickup.label : (zone?.name ?? ""),
        city: get("city"),
        address: mode === "pickup" ? "" : get("address"),
        note: get("note") || undefined,
      },
      delivery: mode === "pickup" ? pickup.label : `livraison, ${zone?.delay}`,
      payment,
      subtotal,
      fee,
    });

    // Meta Pixel : commande confirmée. Purchase (optimisation sur la valeur)
    // et Lead (campagnes « prospects »), avec un identifiant d'événement unique.
    const eventID = newEventId();
    const order = {
      content_ids: items.map((i) => i.slug),
      contents: items.map((i) => ({ id: i.slug, quantity: i.qty })),
      content_type: "product",
      num_items: items.reduce((n, i) => n + i.qty, 0),
      ...money(subtotal + fee),
    };
    track("Purchase", order, { eventID });
    track("Lead", money(subtotal + fee), { eventID: `${eventID}-lead` });

    const link = whatsappLink(message);
    window.open(link, "_blank", "noopener,noreferrer");
    setSentLink(link);
    clear();
  };

  const radioCard = (checked: boolean) =>
    cn(
      "flex cursor-pointer items-center gap-3 rounded-2xl p-4 ring-1 transition-colors",
      checked ? "bg-accent-soft ring-accent" : "bg-raised/40 ring-line hover:ring-fg/40",
    );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
      <div className="space-y-8">
        <fieldset className="rounded-card bg-surface p-5 shadow-soft sm:p-7">
          <legend className="sr-only">{t.checkout.contact}</legend>
          <h2 className="text-xl font-extrabold">{t.checkout.contact}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t.checkout.name} name="name" autoComplete="name" required error={errors.name} />
            <Field
              label={t.checkout.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={phonePlaceholder}
              hint={phoneHint}
              required
              error={errors.phone}
            />
          </div>
        </fieldset>

        <fieldset className="rounded-card bg-surface p-5 shadow-soft sm:p-7">
          <legend className="sr-only">{t.checkout.delivery}</legend>
          <h2 className="text-xl font-extrabold">{t.checkout.delivery}</h2>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {zones.length > 0 && (
              <label className={radioCard(mode === "home")}>
                <input type="radio" name="mode" checked={mode === "home"} onChange={() => setMode("home")} className="size-5 accent-[var(--accent)]" />
                <span className="flex-1">
                  <span className="block font-semibold">{t.checkout.homeDelivery}</span>
                  <span className="block text-sm text-muted">{zone ? `${zone.delay} · ${fee ? formatPrice(fee) : t.checkout.free}` : t.checkout.chooseZone}</span>
                </span>
              </label>
            )}
            {pickup.enabled && (
              <label className={radioCard(mode === "pickup")}>
                <input type="radio" name="mode" checked={mode === "pickup"} onChange={() => setMode("pickup")} className="size-5 accent-[var(--accent)]" />
                <span className="flex-1">
                  <span className="block font-semibold">{pickup.label}</span>
                  <span className="block text-sm text-muted">
                    {pickup.delay ? `${pickup.delay} · ` : ""}
                    {t.checkout.free}
                  </span>
                </span>
              </label>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {mode === "home" && (
              <SelectField
                label={t.checkout.region}
                name="region"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
                error={errors.region}
                className="sm:col-span-2"
              >
                <option value="" disabled>
                  {t.checkout.choose}
                </option>
                {zoneGroups.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} · {formatPrice(z.fee)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </SelectField>
            )}
            <Field label={t.checkout.city} name="city" autoComplete="address-level2" placeholder="Quartier, ville" error={errors.city} />
            {mode === "home" && (
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
          {mode === "home" && offered && <p className="mt-3 text-sm font-semibold text-success">{t.checkout.offeredByProduct}</p>}
          {mode === "home" && !offered && freeFrom != null && <p className="mt-3 text-sm text-muted">{t.checkout.freeFrom(formatPrice(freeFrom))}</p>}
        </fieldset>

        <fieldset className="rounded-card bg-surface p-5 shadow-soft sm:p-7">
          <legend className="sr-only">{t.checkout.payment}</legend>
          <h2 className="text-xl font-extrabold">{t.checkout.payment}</h2>
          {payments.length > 1 ? (
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {payments.map((m) => (
                <label key={m.id} className={radioCard(payment === m.id)}>
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id)}
                    className="size-5 accent-[var(--accent)]"
                  />
                  <span className="font-semibold">{m.label}</span>
                </label>
              ))}
            </div>
          ) : (
            selectedPayment && (
              <p className="mt-5 flex items-center gap-3 rounded-2xl bg-accent-soft p-4 font-semibold ring-1 ring-accent/30">
                <IconCash size={22} className="shrink-0 text-accent" />
                {selectedPayment.label}
              </p>
            )
          )}
          {selectedPayment?.instructions && <p className="mt-3 rounded-2xl bg-raised p-3 text-sm">{selectedPayment.instructions}</p>}
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-card bg-surface p-5 shadow-soft sm:p-7">
          <h2 className="text-xl font-extrabold">{t.checkout.summary}</h2>
          <ul className="mt-4 divide-y divide-line">
            {items.map((i) => (
              <li key={i.key} className="flex items-center gap-3 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-raised">
                  <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />
                  <span className="absolute end-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.65rem] font-bold text-on-accent">
                    {i.qty}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{i.name}</span>
                  {i.variant && <span className="block truncate text-sm text-muted">{i.variant}</span>}
                </span>
                <span className="font-semibold whitespace-nowrap">{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[0.9375rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.cart.subtotal}</dt>
              <dd className="font-semibold whitespace-nowrap">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t.checkout.delivery}</dt>
              <dd className="font-semibold whitespace-nowrap">
                {mode === "home" && !zone ? t.checkout.chooseZoneShort : fee ? formatPrice(fee) : t.checkout.free}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <dt className="font-bold">{t.checkout.total}</dt>
              <dd className="text-2xl font-extrabold tracking-tight whitespace-nowrap">{formatPrice(subtotal + fee)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" className="mt-5 w-full">
            {t.checkout.submit}
          </Button>
          <p className="mt-3 text-center text-sm text-muted">{t.checkout.noOnlinePayment}</p>
        </div>
      </aside>
    </form>
  );
}
