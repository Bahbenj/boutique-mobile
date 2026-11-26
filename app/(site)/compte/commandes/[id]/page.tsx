import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deliveryLabel, paymentLabel } from "@/lib/admin/orders-shared";
import { customerStatus, getMyOrder } from "@/lib/customer-orders";
import { getStoreInfo } from "@/lib/storefront";
import { formatPrice } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { OrderTimeline, StatusPill, formatDay } from "@/components/account/OrderBits";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { IconWhatsApp } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Ma commande", robots: { index: false } };

/**
 * Coquille prérendue (barre du site, cadre) ; la commande elle-même est lue à la
 * requête, sous <Suspense>, avec la session du client. Identifiant fictif : il
 * ne correspond à aucune commande.
 */
export function generateStaticParams() {
  return [{ id: "00000000-0000-0000-0000-000000000000" }];
}

/** Détail d'une commande du client (RLS : la sienne uniquement, sinon page introuvable). */
export default function MyOrderPage({ params }: PageProps<"/compte/commandes/[id]">) {
  return (
    <Container className="pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <Link href="/compte/commandes" className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
          ← Mes commandes
        </Link>
        <Suspense fallback={<div className="skeleton mt-6 h-96 rounded-card" />}>
          <Order params={params} />
        </Suspense>
      </div>
    </Container>
  );
}

async function Order({ params }: Pick<PageProps<"/compte/commandes/[id]">, "params">) {
  const { id } = await params;
  const [found, store] = await Promise.all([getMyOrder(id), getStoreInfo()]);
  if (!found) notFound();
  const { order: o, history } = found;
  const message = `Bonjour, je vous écris au sujet de ma commande ${o.number}.`;
  return (
    <>
      <h1 className="mt-3 flex flex-wrap items-center gap-3 text-[clamp(2rem,8vw,3rem)] leading-none font-extrabold tracking-[-0.04em]">
        {o.number}
        <StatusPill status={o.status} />
      </h1>
      <p className="mt-2 text-muted">Passée le {formatDay(o.created_at)}</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-card bg-surface p-5 shadow-soft sm:p-6">
          <h2 className="text-lg font-extrabold">Articles</h2>
          <ul className="mt-3 divide-y divide-line">
            {o.items.map((l, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-raised">
                  {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.name}</span>
                  <span className="block text-sm text-muted">
                    {[l.color, l.storage].filter(Boolean).join(" · ")}
                    {(l.color || l.storage) && " · "}
                    {l.qty} × {formatPrice(l.price)}
                  </span>
                </span>
                <span className="font-semibold whitespace-nowrap tabular-nums">{formatPrice(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[0.9375rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Sous-total</dt>
              <dd className="tabular-nums">{formatPrice(o.subtotal)}</dd>
            </div>
            {o.discount > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Code {o.promo_code}</dt>
                <dd className="text-success tabular-nums">−{formatPrice(o.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{deliveryLabel(o.delivery_method)}</dt>
              <dd className="tabular-nums">{o.delivery_fee ? formatPrice(o.delivery_fee) : "Offerte"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
              <dt className="font-bold">Total</dt>
              <dd className="text-xl font-extrabold tabular-nums">{formatPrice(o.total)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-muted">Paiement : {paymentLabel(o.payment_method)}</p>
        </section>

        <div className="space-y-4">
          <section className="rounded-card bg-surface p-5 shadow-soft sm:p-6">
            <h2 className="mb-3 text-lg font-extrabold">Suivi</h2>
            <OrderTimeline status={o.status} history={history} />
            {o.status !== "annulee" && o.status !== "livree" && <p className="mt-3 text-sm text-muted">{customerStatus[o.status].help}</p>}
          </section>
          <section className="rounded-card bg-surface p-5 shadow-soft sm:p-6">
            <h2 className="text-lg font-extrabold">{o.delivery_method === "pickup" ? "Retrait" : "Livraison"}</h2>
            <p className="mt-2 text-[0.9375rem]">{[o.address, o.city, o.region].filter(Boolean).join(", ")}</p>
            <Button href={whatsappLink(message, store.whatsapp)} variant="whatsapp" className="mt-4 max-sm:w-full">
              <IconWhatsApp size={18} />
              Une question ? WhatsApp
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
