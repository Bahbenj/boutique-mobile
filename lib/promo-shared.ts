/**
 * Calculs de promotions et de codes promo, identiques à ceux de la base
 * (promo_discounted, campaign_price et place_order, migration 17). Purs :
 * utilisables côté serveur comme dans le navigateur.
 */

export type DiscountKind = "percent" | "amount";

export type Campaign = {
  kind: DiscountKind;
  value: number;
  scope: "all" | "category" | "product";
  category_id: string | null;
  product_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

/** Code promo tel que vérifié par le serveur (le panier calcule la remise affichée). */
export type AppliedCode = { code: string; kind: DiscountKind; value: number; minOrder: number };

/** Prix après remise : pourcentage arrondi aux 5 FCFA, montant soustrait. */
export function discounted(base: number, kind: DiscountKind, value: number) {
  return kind === "percent" ? Math.round((base * (100 - value)) / 100 / 5) * 5 : base - value;
}

export const campaignRunning = (c: Pick<Campaign, "starts_at" | "ends_at">, now: number) =>
  (!c.starts_at || Date.parse(c.starts_at) <= now) && (!c.ends_at || Date.parse(c.ends_at) > now);

/** Meilleur prix parmi les promotions en cours pour ce produit (base si aucune). */
export function campaignPrice(base: number, product: { id: string; categoryId: string | null }, campaigns: Campaign[], now: number) {
  let best = base;
  for (const c of campaigns) {
    if (!campaignRunning(c, now)) continue;
    const applies = c.scope === "all" || (c.scope === "category" && c.category_id === product.categoryId) || (c.scope === "product" && c.product_id === product.id);
    if (!applies) continue;
    const price = discounted(base, c.kind, Number(c.value));
    if (price > 0 && price < best) best = price;
  }
  return best;
}

/** Remise d'un code sur un sous-total (0 si le minimum n'est pas atteint). */
export function codeDiscount(subtotal: number, code: AppliedCode | null) {
  if (!code || subtotal < code.minOrder) return 0;
  return code.kind === "percent" ? Math.round((subtotal * code.value) / 100) : Math.min(code.value, subtotal);
}

/** « −10 % » ou « −2 000 FCFA » (espaces insécables). */
export function discountLabel(kind: DiscountKind, value: number) {
  return kind === "percent" ? `−${value} %` : `−${new Intl.NumberFormat("fr-FR").format(value).replace(/\s/g, " ")} FCFA`;
}
