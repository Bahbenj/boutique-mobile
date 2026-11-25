import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig, storeAddress } from "@/config/site";
import { Logo } from "@/components/layout/Logo";
import { getOrder } from "@/lib/admin/orders";
import { deliveryLabel, formatOrderDateLong, formatPhone, itemCount, paymentLabel, variantLabel } from "@/lib/admin/orders-shared";
import { formatPrice } from "@/lib/utils";
import { PrintButton } from "@/components/admin/orders/PrintButton";

export const metadata: Metadata = { title: "Bon de livraison" };

/** Bon de livraison A4, noir et blanc, lisible par le livreur et signé par le client. */
export default async function DeliveryNotePage({ params }: PageProps<"/admin/commandes/[id]/bon">) {
  const order = await getOrder((await params).id);
  if (!order) notFound();
  const { phone } = siteConfig;
  const pickup = order.delivery_method === "pickup";

  return (
    <>
      <div className="mx-auto flex max-w-[21cm] items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link href={`/admin/commandes/${order.id}`} className="text-sm font-semibold text-muted hover:text-fg">
          ← Commande {order.number}
        </Link>
        <PrintButton />
      </div>

      <article className="delivery-note mx-auto max-w-[21cm] bg-surface p-6 text-[13px] leading-snug text-black shadow-soft sm:p-10 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-black pb-4">
          <div>
            <Logo variant="light" size="full" href={null} imgClassName="h-auto w-36" className="mb-1.5" />
            <p className="sr-only">{siteConfig.name}</p>
            <p>{storeAddress}</p>
            <p>Tél. {phone}</p>
          </div>
          <div className="text-end">
            <p className="text-xs font-semibold tracking-wide uppercase">Bon de livraison</p>
            <p className="text-2xl font-extrabold">{order.number}</p>
            <p>{formatOrderDateLong(order.created_at)}</p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-1 text-xs font-bold tracking-wide uppercase">Client</h2>
            <p className="text-base font-bold">{order.customer_name}</p>
            <p className="text-base font-bold tabular-nums">{formatPhone(order.phone)}</p>
          </div>
          <div>
            <h2 className="mb-1 text-xs font-bold tracking-wide uppercase">{pickup ? "Retrait" : "Livraison"}</h2>
            <p className="font-semibold">{deliveryLabel(order.delivery_method)}</p>
            {!pickup && <p>{[order.address, order.city].filter(Boolean).join(", ")}</p>}
            <p>{order.region}</p>
          </div>
        </section>

        {order.note && (
          <p className="mt-4 border border-black p-2">
            <strong>Note :</strong> {order.note}
          </p>
        )}

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-start text-xs uppercase">
              <th className="py-2 text-start">Qté</th>
              <th className="py-2 text-start">Désignation</th>
              <th className="py-2 text-end">P.U.</th>
              <th className="py-2 text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i, n) => (
              <tr key={n} className="border-b border-black/30 align-top">
                <td className="py-2 pe-3 font-bold tabular-nums">{i.qty}</td>
                <td className="py-2 pe-3">
                  {i.name}
                  {variantLabel(i) && <span className="block text-xs">{variantLabel(i)}</span>}
                </td>
                <td className="py-2 text-end tabular-nums whitespace-nowrap">{formatPrice(i.price)}</td>
                <td className="py-2 text-end tabular-nums whitespace-nowrap">{formatPrice(i.price * i.qty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="tabular-nums">
            <tr>
              <td colSpan={3} className="pt-3 text-end">
                Sous-total ({itemCount(order)} article{itemCount(order) > 1 ? "s" : ""})
              </td>
              <td className="pt-3 text-end whitespace-nowrap">{formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="text-end">
                Livraison
              </td>
              <td className="text-end whitespace-nowrap">{order.delivery_fee ? formatPrice(order.delivery_fee) : "Offerte"}</td>
            </tr>
            <tr className="text-lg font-extrabold">
              <td colSpan={3} className="pt-2 text-end">
                {order.payment_method === "cod" ? "À encaisser" : "Total"}
              </td>
              <td className="border-2 border-black px-2 pt-2 text-end whitespace-nowrap">{formatPrice(order.total)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-xs">
          Paiement : <strong>{paymentLabel(order.payment_method)}</strong>.{" "}
          {order.payment_method === "cod" ? "Vérifiez le colis en présence du livreur avant de payer." : "Vérifiez la réception du paiement avant de remettre le colis."}
        </p>

        <section className="mt-10 grid grid-cols-2 gap-6">
          <div className="h-24 border border-black p-2 text-xs">Remis le : ____ / ____ / ________</div>
          <div className="h-24 border border-black p-2 text-xs">Signature du client</div>
        </section>
      </article>
    </>
  );
}
