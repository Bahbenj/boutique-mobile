import { paymentLabel, paymentMethods, siteConfig } from "@/config/site";
import { formatMlPhone, waNumber } from "@/lib/phone";
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
  region: string; // zone de livraison (« Bamako – Commune IV ») ou « Retrait en magasin »
  city: string;
  address: string;
  delivery_method: string;
  payment_method: string;
  items: OrderItem[];
  subtotal: number;
  /** Remise du code promo (migration 17 ; 0 sans code). */
  discount: number;
  promo_code: string | null;
  /** Compte client qui a passé la commande (migration 23). */
  user_id?: string | null;
  /** Consignes pour le livreur et position, copiées à l'achat (migration 25). */
  delivery_instructions?: string | null;
  delivery_lat?: number | string | null;
  delivery_lng?: number | string | null;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export const variantLabel = (i: Pick<OrderItem, "color" | "storage">) => [i.color, i.storage].filter(Boolean).join(" · ");

export const deliveryLabel = (id: string) => (id === "pickup" ? siteConfig.delivery.pickup.label : "Livraison à domicile");

export { paymentLabel };

export const itemCount = (o: Pick<DbOrder, "items">) => o.items.reduce((n, i) => n + i.qty, 0);

/** « 76123456 » → « 76 12 34 56 » */
export const formatPhone = formatMlPhone;

// --- Dates : toujours à l'heure du magasin -----------------------------------------

export const SHOP_TZ = siteConfig.timeZone; // Africa/Bamako (GMT)

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: SHOP_TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const fullDateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: SHOP_TZ, dateStyle: "long", timeStyle: "short" });
const csvDateFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: SHOP_TZ, dateStyle: "short", timeStyle: "short" });

export const formatOrderDate = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatOrderDateLong = (iso: string) => fullDateFmt.format(new Date(iso));
/** « 2026-11-25 14:05 » : triable dans un tableur */
export const formatCsvDate = (iso: string) => csvDateFmt.format(new Date(iso));

// --- WhatsApp : message au client selon le statut ----------------------------------

export function customerMessage(
  o: Pick<DbOrder, "number" | "customer_name" | "total" | "status" | "address" | "city" | "region" | "delivery_method" | "payment_method">,
) {
  const firstName = o.customer_name.trim().split(/\s+/)[0];
  const total = formatPrice(Number(o.total));
  const hello = `Bonjour ${firstName}, ici ${siteConfig.name}.`;
  const pickup = o.delivery_method === "pickup";
  const where = [o.address, o.city, o.region].filter(Boolean).join(", ");
  // Mobile Money / virement : instructions de paiement du magasin
  const method = paymentMethods.find((m) => m.id === o.payment_method);
  const payNow = method && method.id !== "cod"
    ? ` Paiement par ${method.label} : ${method.account ? `envoyez ${total} au ${method.account}` : method.instructions}${method.account ? " en indiquant le n° " + o.number : ""}.`
    : "";
  switch (o.status) {
    case "nouvelle":
      return pickup
        ? `${hello} Nous avons bien reçu votre commande ${o.number} (${total}), à retirer en magasin. Pouvez-vous nous confirmer votre passage ?`
        : `${hello} Nous avons bien reçu votre commande ${o.number} (${total}). Pouvez-vous confirmer l'adresse de livraison : ${where} ?${payNow}`;
    case "confirmee":
      return pickup
        ? `${hello} Votre commande ${o.number} est prête : vous pouvez la retirer en magasin. Total à régler : ${total}.`
        : `${hello} Votre commande ${o.number} est confirmée et sera expédiée très bientôt.${payNow || ` Total à régler à la livraison : ${total}.`}`;
    case "expediee":
      return `${hello} Votre commande ${o.number} est en route.${o.payment_method === "cod" ? ` Prévoyez ${total} en espèces pour le livreur.` : ""}`;
    case "livree":
      return `${hello} Merci pour votre achat (commande ${o.number}) ! N'hésitez pas à nous écrire pour toute question.`;
    case "annulee":
      return `${hello} Votre commande ${o.number} a été annulée. Contactez-nous si c'est une erreur.`;
  }
}

/** Lien wa.me vers le client (numéro malien à 8 chiffres, indicatif 223 ajouté). */
export const customerWhatsapp = (o: Parameters<typeof customerMessage>[0] & { phone: string }) =>
  `https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(customerMessage(o))}`;

/** Ligne de l'historique des statuts (table order_status_history, migration 12). */
export type OrderHistoryEntry = {
  id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by_email: string | null;
  changed_by: string | null;
  created_at: string;
};

/** Auteur lisible d'un changement : admin, client (création sur le site) ou inconnu (avant l'historique). */
export const historyAuthor = (h: OrderHistoryEntry) =>
  h.changed_by_email ?? (h.from_status === null ? "Client (site)" : h.changed_by ? "Administrateur" : "Avant l'historique");

// --- Tri de la liste ---------------------------------------------------------------------

export const sorts = { recent: "Plus récentes", ancien: "Plus anciennes" } as const;
export type Sort = keyof typeof sorts;

// --- Périodes de la liste -----------------------------------------------------------

export const periods = { jour: "Aujourd'hui", semaine: "Cette semaine", mois: "Ce mois-ci" } as const;
export type Period = keyof typeof periods;

/** Début de la période à l'heure du magasin (Bamako), en instant UTC (ISO). */
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

/**
 * Message WhatsApp pour demander un avis après une commande livrée : un lien par
 * produit vers « Donner mon avis » (le client se connecte, puis revient au formulaire).
 */
export function reviewRequestWhatsapp(o: Pick<DbOrder, "phone" | "customer_name" | "number"> & { items: { name: string; slug?: string }[] }, origin: string) {
  const first = o.customer_name.trim().split(/\s+/)[0] ?? "";
  const seen = new Set<string>();
  const links = o.items
    .filter((i) => i.slug && !seen.has(i.slug) && seen.add(i.slug))
    .map((i) => `• ${i.name} : ${origin}/compte/avis?produit=${i.slug}`);
  const text = [
    `Bonjour ${first}, merci pour votre commande ${o.number} chez ${siteConfig.name} !`,
    "Êtes-vous satisfait de votre achat ? Votre avis aide beaucoup les autres clients (1 minute) :",
    ...links,
    "Merci et à bientôt !",
  ].join("\n");
  return `https://wa.me/${waNumber(o.phone)}?text=${encodeURIComponent(text)}`;
}
