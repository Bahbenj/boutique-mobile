import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/utils";

/** Commandes : types, statuts et messages, partagés navigateur / serveur. */

export const orderStatuses = ["nouvelle", "confirmee", "expediee", "livree", "annulee"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const statusLabels: Record<OrderStatus, string> = {
  nouvelle: "Nouvelle",
  confirmee: "Confirmée",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

/** Étape suivante du circuit normal (bouton principal de la fiche). */
export const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  nouvelle: { status: "confirmee", label: "Confirmer la commande" },
  confirmee: { status: "expediee", label: "Marquer comme expédiée" },
  expediee: { status: "livree", label: "Marquer comme livrée" },
};

export type OrderItem = {
  product_id: string;
  slug: string;
  name: string;
  color: string | null;
  storage: string | null;
  qty: number;
  price: number;
  image: string | null;
};

export type DbOrder = {
  id: string;
  number: string;
  customer_name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  delivery_method: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export const variantLabel = (i: Pick<OrderItem, "color" | "storage">) => [i.color, i.storage].filter(Boolean).join(" · ");

export const deliveryLabel = (id: string) => siteConfig.delivery.options.find((o) => o.id === id)?.label ?? id;

export const itemCount = (o: Pick<DbOrder, "items">) => o.items.reduce((n, i) => n + i.qty, 0);

/** « 22123456 » → « 22 123 456 » */
export const formatPhone = (p: string) => p.replace(/^(\d{2})(\d{3})(\d{3})$/, "$1 $2 $3");

// --- Dates : toujours à l'heure du magasin -----------------------------------------

export const SHOP_TZ = "Africa/Tunis";

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: SHOP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fullDateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: SHOP_TZ, dateStyle: "long", timeStyle: "short" });
const csvDateFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: SHOP_TZ, dateStyle: "short", timeStyle: "short" });

export const formatOrderDate = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatOrderDateLong = (iso: string) => fullDateFmt.format(new Date(iso));
/** « 2026-11-25 14:05 » : triable dans un tableur */
export const formatCsvDate = (iso: string) => csvDateFmt.format(new Date(iso));

// --- WhatsApp : message au client selon le statut ----------------------------------

export function customerMessage(o: Pick<DbOrder, "number" | "customer_name" | "total" | "status" | "address" | "city" | "governorate" | "delivery_method">) {
  const firstName = o.customer_name.trim().split(/\s+/)[0];
  const total = formatPrice(Number(o.total));
  const hello = `Bonjour ${firstName}, ici ${siteConfig.name}.`;
  const pickup = o.delivery_method === "pickup";
  const where = [o.address, o.city, o.governorate].filter(Boolean).join(", ");
  switch (o.status) {
    case "nouvelle":
      return pickup
        ? `${hello} Nous avons bien reçu votre commande ${o.number} (${total}), à retirer en magasin. Pouvez-vous nous confirmer votre passage ?`
        : `${hello} Nous avons bien reçu votre commande ${o.number} (${total}). Pouvez-vous confirmer l'adresse de livraison : ${where} ?`;
    case "confirmee":
      return pickup
        ? `${hello} Votre commande ${o.number} est prête : vous pouvez la retirer en magasin. Total à régler : ${total}.`
        : `${hello} Votre commande ${o.number} est confirmée et sera expédiée très bientôt. Total à régler à la livraison : ${total}.`;
    case "expediee":
      return `${hello} Votre commande ${o.number} est en route. Prévoyez ${total} en espèces pour le livreur.`;
    case "livree":
      return `${hello} Merci pour votre achat (commande ${o.number}) ! N'hésitez pas à nous écrire pour toute question.`;
    case "annulee":
      return `${hello} Votre commande ${o.number} a été annulée. Contactez-nous si c'est une erreur.`;
  }
}

/** Lien wa.me vers le client (numéro tunisien à 8 chiffres). */
export const customerWhatsapp = (o: Parameters<typeof customerMessage>[0] & { phone: string }) =>
  `https://wa.me/216${o.phone}?text=${encodeURIComponent(customerMessage(o))}`;

// --- Périodes de la liste -----------------------------------------------------------

export const periods = { jour: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois-ci" } as const;
export type Period = keyof typeof periods;

/** Début de la période à l'heure de Tunis, en instant UTC (ISO). */
export function periodStart(period: Period, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, year: "numeric", month: "numeric", day: "numeric", weekday: "short", timeZoneName: "longOffset" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  // « GMT+01:00 » → +60 min
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(parts.timeZoneName ?? "");
  const offsetMin = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 60;
  let day = Number(parts.day);
  if (period === "semaine") day -= (["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday));
  if (period === "mois") day = 1;
  const localMidnightUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, day);
  return new Date(localMidnightUtc - offsetMin * 60_000).toISOString();
}
