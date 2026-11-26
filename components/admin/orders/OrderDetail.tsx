import Image from "next/image";
import Link from "next/link";
import {
  customerWhatsapp,
  deliveryLabel,
  formatOrderDateLong,
  historyAuthor,
  itemCount,
  paymentLabel,
  statusLabels,
  variantLabel,
  type DbOrder,
  type OrderHistoryEntry,
} from "@/lib/admin/orders-shared";
import { formatMlPhoneIntl, telLink } from "@/lib/phone";
import { siteConfig } from "@/config/site";
import { reviewRequestWhatsapp } from "@/lib/admin/orders-shared";
import { IconStar } from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { FormSection } from "@/components/admin/ui";
import { StatusBadge } from "./StatusBadge";
import { StatusControl } from "./StatusControl";
import { buttonClasses } from "@/components/ui/Button";
import { IconImage, IconPhone, IconReceipt, IconWhatsApp } from "@/components/ui/icons";

/**
 * Fiche d'une commande : actions rapides (WhatsApp selon le statut, appel, bon
 * de livraison), articles et totaux, client, statut et historique des
 * changements (qui et quand). Composant d'affichage : la page lit les données.
 */
export function OrderDetail({ order, history, account = null }: { order: DbOrder; history: OrderHistoryEntry[]; account?: { email: string; userId: string } | null }) {
  const pickup = order.delivery_method === "pickup";

  return (
    <AdminPage
      title={`Commande ${order.number}`}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          {formatOrderDateLong(order.created_at)}
        </span>
      }
      actions={
        <Link href="/admin/commandes" className="text-sm font-semibold text-muted hover:text-fg">
          ← Commandes
        </Link>
      }
    >
      {/* Actions rapides : à portée de pouce sur mobile */}
      <div className="mb-5 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        <a href={customerWhatsapp(order)} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "px-3 sm:px-5")}>
          <IconWhatsApp size={18} />
          <span className="max-sm:sr-only">Contacter sur </span>WhatsApp
        </a>
        <a href={telLink(order.phone)} className={buttonClasses("light", "md", "px-3 shadow-soft sm:px-5")}>
          <IconPhone size={18} />
          Appeler
        </a>
        <a href={`/admin/commandes/${order.id}/bon`} target="_blank" rel="noopener" className={buttonClasses("light", "md", "px-3 shadow-soft sm:px-5")}>
          <IconReceipt size={18} />
          <span>
            Bon<span className="max-sm:sr-only"> de livraison</span>
          </span>
        </a>
        {order.status === "livree" && (
          <a
            href={reviewRequestWhatsapp(order, (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, ""))}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("light", "md", "col-span-3 px-3 shadow-soft sm:col-span-1 sm:px-5")}
          >
            <IconStar size={18} />
            Demander un avis
          </a>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-5">
          <FormSection title={`Articles (${itemCount(order)})`}>
            <ul className="divide-y divide-line">
              {order.items.map((item, i) => (
                <li key={`${item.product_id}-${i}`} className="flex items-center gap-3 py-3 first:pt-0">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-raised">
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-muted">
                        <IconImage size={18} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/admin/produits?q=${encodeURIComponent(item.name)}`} className="block truncate font-semibold hover:underline">
                      {item.name}
                    </Link>
                    <span className="block text-sm text-muted">
                      {[variantLabel(item), `${item.qty} × ${formatPrice(item.price)}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums">{formatPrice(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-[0.9375rem]">
              <div className="flex justify-between">
                <dt className="text-muted">Sous-total</dt>
                <dd className="font-semibold tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Code promo {order.promo_code}</dt>
                  <dd className="font-semibold text-success tabular-nums">−{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">{deliveryLabel(order.delivery_method)}</dt>
                <dd className="font-semibold tabular-nums">{order.delivery_fee ? formatPrice(order.delivery_fee) : "Offerte"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2">
                <dt className="font-bold">{order.payment_method === "cod" ? "Total à encaisser" : "Total"}</dt>
                <dd className="text-2xl font-extrabold tracking-tight">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </FormSection>

          <FormSection title="Client">
            <dl className="grid gap-3 text-[0.9375rem] sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted">Nom</dt>
                <dd className="font-semibold">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">Téléphone</dt>
                <dd>
                  <a href={telLink(order.phone)} className="font-semibold tabular-nums hover:underline">
                    {formatMlPhoneIntl(order.phone)}
                  </a>
                </dd>
              </div>
              {account && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-muted">Compte client</dt>
                  <dd>
                    <a href={`/admin/clients?q=${encodeURIComponent(account.email)}`} className="font-semibold break-all text-accent hover:underline">
                      {account.email}
                    </a>
                  </dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-muted">{pickup ? "Retrait" : "Adresse de livraison"}</dt>
                <dd className="font-semibold">
                  {pickup ? "En magasin" : [order.address, order.city].filter(Boolean).join(", ")}
                  <span className="block font-normal text-muted">{order.region}</span>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-muted">Paiement choisi</dt>
                <dd className="font-semibold">
                  {paymentLabel(order.payment_method)}
                  {order.payment_method !== "cod" && (
                    <span className="block text-sm font-normal text-muted">Vérifiez la réception du paiement avant d&apos;expédier.</span>
                  )}
                </dd>
              </div>
              {order.note && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-muted">Note du client</dt>
                  <dd className="rounded-2xl bg-accent-soft p-3">{order.note}</dd>
                </div>
              )}
            </dl>
          </FormSection>
        </div>

        <div className="lg:sticky lg:top-6">
          <FormSection title="Statut">
            <StatusControl id={order.id} number={order.number} status={order.status} />
          </FormSection>
          <FormSection title="Historique" className="mt-5">
            {history.length ? (
              <ol className="relative space-y-4 border-s border-line ps-5">
                {history.map((h) => (
                  <li key={h.id} className="relative">
                    <span aria-hidden="true" className="hex absolute -start-[1.6rem] top-1 h-3 w-[0.65rem] bg-accent" />
                    <p className="text-sm font-semibold">
                      {h.from_status ? (
                        <>
                          {statusLabels[h.from_status]} → {statusLabels[h.to_status]}
                        </>
                      ) : (
                        <>Commande passée ({statusLabels[h.to_status]})</>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      <time dateTime={h.created_at}>{formatOrderDateLong(h.created_at)}</time> · <span className="break-all">{historyAuthor(h)}</span>
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Aucun historique (migration 12 à exécuter).</p>
            )}
          </FormSection>
        </div>
      </div>
    </AdminPage>
  );
}
