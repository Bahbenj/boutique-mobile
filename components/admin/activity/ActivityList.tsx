import Link from "next/link";
import type { ActivityEntry } from "@/lib/admin/activity";
import { orderStatuses, statusLabels } from "@/lib/admin/orders-shared";
import { repairStatusLabels } from "@/lib/admin/repairs-shared";
import { formatPrice } from "@/lib/utils";

/** Noms lisibles des champs journalisés ; les champs absents d'ici ne sont pas affichés. */
const fields: Record<string, string> = {
  name: "nom",
  price: "prix",
  promo_price: "prix promo",
  promo_starts_at: "début de promo",
  promo_ends_at: "fin de promo",
  stock: "stock",
  is_active: "visibilité",
  is_featured: "mise en avant",
  category_id: "catégorie",
  brand: "marque",
  tag: "pastille",
  free_delivery: "livraison offerte",
  images: "photos",
  description: "description",
  variants: "couleurs ou capacités",
  specs: "caractéristiques",
  highlights: "points forts",
  slug: "adresse de la page",
  status: "statut",
  quote_amount: "devis",
  internal_notes: "notes internes",
  value: "contenu",
  kind: "type de remise",
  scope: "cible",
  starts_at: "début",
  ends_at: "fin",
  expires_at: "expiration",
  max_uses: "utilisations max.",
  min_order: "achat minimum",
  fee: "frais",
  delay: "délai",
  rating: "note",
  text: "texte",
  is_published: "publication",
  role: "rôle",
  code: "code",
  image: "photo",
  image_bg: "fond de photo",
  condition: "état",
};
/** Gros champs (valeurs non conservées) : phrase toute faite. */
const changedOnly: Record<string, string> = {
  images: "nouvelles photos",
  description: "description modifiée",
  variants: "couleurs ou capacités modifiées",
  specs: "caractéristiques modifiées",
  highlights: "points forts modifiés",
  value: "contenu modifié",
  internal_notes: "notes internes modifiées",
};
const articles: Record<string, string> = {
  produit: "le produit",
  catégorie: "la catégorie",
  promotion: "la promotion",
  "code promo": "le code promo",
  réglage: "les réglages",
  "zone de livraison": "la zone de livraison",
  avis: "l'avis de",
  commande: "la commande",
  réparation: "la réparation",
  "membre de l'équipe": "l'accès de",
};
const settingsKeys: Record<string, string> = { store: "Boutique", announcement: "Bandeau", delivery: "Livraison", payment: "Paiement", stock: "Stock" };
const money = new Set(["price", "promo_price", "quote_amount", "min_order", "fee"]);
const roles: Record<string, string> = { owner: "Propriétaire", manager: "Gérant", seller: "Vendeur" };
const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Bamako" });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Bamako" });
const dayKey = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Bamako" });

function show(field: string, v: unknown, entity: string): string {
  if (v === null || v === undefined || v === "") return "vide";
  if (v === "…") return "";
  if (money.has(field)) return formatPrice(Number(v));
  if (field === "is_active") return v ? (entity === "catégorie" || entity === "produit" ? "en vente" : "actif") : "masqué";
  if (field === "is_featured" || field === "free_delivery" || field === "is_published") return v ? "oui" : "non";
  if (field === "status") return entity === "réparation" ? (repairStatusLabels[v as keyof typeof repairStatusLabels] ?? String(v)) : (orderStatuses as readonly string[]).includes(String(v)) ? statusLabels[v as keyof typeof statusLabels] : String(v);
  if (field === "role") return roles[String(v)] ?? String(v);
  if (/_at$/.test(field)) return date.format(new Date(String(v)));
  if (field === "category_id") return "autre catégorie";
  return String(v).slice(0, 60);
}

function describe(e: ActivityEntry) {
  const label = e.entity === "réglage" ? (settingsKeys[e.label ?? ""] ?? e.label) : e.label;
  const what = `${articles[e.entity] ?? e.entity}${label ? ` « ${label} »` : ""}`;
  if (e.action !== "modification") return { title: `${e.action === "ajout" ? "a ajouté" : "a supprimé"} ${what}`, details: [] as string[] };
  const details = Object.entries(e.changes ?? {})
    .filter(([k]) => fields[k] || changedOnly[k])
    .map(([k, [a, b]]) => {
      if (changedOnly[k]) return changedOnly[k];
      const from = show(k, a, e.entity);
      const to = show(k, b, e.entity);
      return `${fields[k]} : ${from} → ${to}`;
    });
  return { title: `a modifié ${what}`, details };
}

function href(e: ActivityEntry) {
  if (!e.entity_id || e.action === "suppression") return null;
  if (e.entity === "produit") return `/admin/produits/${e.entity_id}`;
  if (e.entity === "commande") return `/admin/commandes/${e.entity_id}`;
  if (e.entity === "réparation") return `/admin/reparations/${e.entity_id}`;
  return null;
}

/** Journal groupé par jour : « qui a fait quoi », avec l'avant → après. */
export function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  const groups = new Map<string, ActivityEntry[]>();
  for (const e of entries) {
    const k = dayKey.format(new Date(e.created_at));
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return (
    <div className="space-y-6">
      {[...groups].map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-bold text-muted first-letter:uppercase">{day}</h2>
          <ol className="divide-y divide-line rounded-card bg-surface shadow-soft">
            {list.map((e) => {
              const d = describe(e);
              const link = href(e);
              return (
                <li key={e.id} className="flex gap-3 p-3 sm:p-4">
                  <span className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-muted tabular-nums">{time.format(new Date(e.created_at))}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words">
                      <span className="font-semibold">{e.actor_email?.split("@")[0] ?? "?"}</span> {d.title}
                      {link && (
                        <>
                          {" "}
                          <Link href={link} className="text-sm font-semibold whitespace-nowrap text-accent hover:underline">
                            Voir
                          </Link>
                        </>
                      )}
                    </p>
                    {d.details.length > 0 && (
                      <ul className="mt-0.5 text-sm text-muted">
                        {d.details.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
