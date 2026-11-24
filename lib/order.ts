import { siteConfig, type DeliveryOptionId } from "@/config/site";
import { formatPrice } from "./utils";

/** Frais de livraison : offerts au-delà du seuil, sauf option payante explicite (express). */
export function deliveryFee(optionId: DeliveryOptionId, subtotal: number) {
  const option = siteConfig.delivery.options.find((o) => o.id === optionId);
  if (!option) return 0;
  if (optionId === "home" && subtotal >= siteConfig.delivery.freeFrom) return 0;
  return option.price;
}

export type OrderLine = { name: string; variant?: string; qty: number; price: number };
export type OrderCustomer = {
  name: string;
  phone: string;
  governorate: string;
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
  subtotal,
  fee,
}: {
  number?: string;
  lines: OrderLine[];
  customer: OrderCustomer;
  delivery: string;
  subtotal: number;
  fee: number;
}) {
  const rows = lines.map((l) => `• ${l.qty} × ${l.name}${l.variant ? ` (${l.variant})` : ""} : ${formatPrice(l.price * l.qty)}`);
  return [
    `Bonjour, je souhaite passer commande${number ? ` (n° ${number})` : ""} :`,
    "",
    ...rows,
    "",
    `Sous-total : ${formatPrice(subtotal)}`,
    `Livraison (${delivery}) : ${fee ? formatPrice(fee) : "offerte"}`,
    `Total à payer à la livraison : ${formatPrice(subtotal + fee)}`,
    "",
    `Nom : ${customer.name}`,
    `Téléphone : ${customer.phone}`,
    `Adresse : ${customer.address}, ${customer.city}, ${customer.governorate}`,
    ...(customer.note ? [`Note : ${customer.note}`] : []),
  ].join("\n");
}

/** Numéro tunisien : 8 chiffres, éventuellement précédé de +216 / 00216. */
export function normalizeTnPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^(00)?216/, "");
  return /^[2-9]\d{7}$/.test(digits) ? digits : null;
}
