import { paymentLabel, type DeliveryZone, type PaymentMethod } from "@/config/site";
import { formatMlPhoneIntl } from "./phone";
import { formatPrice } from "./utils";

export type DeliveryMode = "home" | "pickup";

/**
 * Frais de livraison : ceux de la zone, offerts au-delà du seuil ; retrait
 * gratuit. Calcul d'AFFICHAGE : le montant facturé est recalculé en base
 * (place_order) à partir des zones et réglages enregistrés.
 */
export function deliveryFee(
  mode: DeliveryMode,
  zone: Pick<DeliveryZone, "fee"> | undefined,
  subtotal: number,
  freeFrom: number | null,
  /** Le panier contient un produit à livraison offerte. */
  offered = false,
) {
  if (mode === "pickup" || !zone || offered) return 0;
  if (freeFrom != null && subtotal >= freeFrom) return 0;
  return zone.fee;
}

export type OrderLine = { name: string; variant?: string; qty: number; price: number };
export type OrderCustomer = {
  name: string;
  phone: string; // 8 chiffres
  region: string; // nom de la zone (« Bamako – Commune IV »)
  city: string;
  address: string;
  note?: string;
};

/** Message WhatsApp récapitulatif envoyé au magasin. */
export function orderWhatsappMessage({
  number,
  lines,
  customer,
  delivery,
  payment,
  subtotal,
  discount = 0,
  promoCode,
  fee,
}: {
  number?: string;
  lines: OrderLine[];
  customer: OrderCustomer;
  delivery: string;
  payment: PaymentMethod["id"];
  subtotal: number;
  discount?: number;
  promoCode?: string | null;
  fee: number;
}) {
  const rows = lines.map((l) => `• ${l.qty} × ${l.name}${l.variant ? ` (${l.variant})` : ""} : ${formatPrice(l.price * l.qty)}`);
  return [
    `Bonjour, je souhaite passer commande${number ? ` (n° ${number})` : ""} :`,
    "",
    ...rows,
    "",
    `Sous-total : ${formatPrice(subtotal)}`,
    ...(discount > 0 ? [`Code promo${promoCode ? ` ${promoCode}` : ""} : −${formatPrice(discount)}`] : []),
    `Livraison (${delivery}) : ${fee ? formatPrice(fee) : "offerte"}`,
    `Total : ${formatPrice(subtotal - discount + fee)}`,
    `Paiement : ${paymentLabel(payment)}`,
    "",
    `Nom : ${customer.name}`,
    `Téléphone : ${formatMlPhoneIntl(customer.phone)}`,
    `Adresse : ${[customer.address, customer.city, customer.region].filter(Boolean).join(", ")}`,
    ...(customer.note ? [`Note : ${customer.note}`] : []),
  ].join("\n");
}
