import { siteConfig } from "@/config/site";

/** Concatène des classes en ignorant les valeurs falsy. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const NBSP = " ";
const amountFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/**
 * Format monétaire unique du site : 650000 → « 650 000 FCFA ».
 * Franc CFA sans décimales (arrondi à l'unité), séparateur de milliers et
 * espace avant l'unité insécables : le montant ne se coupe jamais en fin de
 * ligne. (L'espace fine U+202F d'Intl n'existe pas dans Plus Jakarta Sans.)
 */
export function formatPrice(value: number) {
  return formatAmount(value) + NBSP + siteConfig.currencyLabel;
}

/** Montant seul, sans unité : 650000 → « 650 000 ». */
export function formatAmount(value: number) {
  return amountFormatter.format(Math.round(value)).replace(/[\s ]/g, NBSP);
}
