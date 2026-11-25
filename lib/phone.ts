import { siteConfig } from "@/config/site";

/**
 * Téléphones maliens : indicatif +223, numéros à 8 chiffres.
 * En base on stocke les 8 chiffres seuls ; l'indicatif est ajouté pour les
 * liens (tel:, wa.me) et l'affichage.
 */

const PREFIX = siteConfig.phonePrefix; // « 223 »

/**
 * Normalise une saisie libre : « +223 76 12 34 56 », « 00223 76123456 »,
 * « 76-12-34-56 » → « 76123456 ». Renvoie null si ce n'est pas un numéro valide.
 */
export function normalizeMlPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(new RegExp(`^(00)?${PREFIX}(?=\\d{8}$)`), "");
  return /^[2-9]\d{7}$/.test(digits) ? digits : null;
}

/** « 76123456 » → « 76 12 34 56 » (groupes de deux, usage malien). */
export function formatMlPhone(local: string) {
  return local.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
}

/** « 76123456 » → « +223 76 12 34 56 » */
export const formatMlPhoneIntl = (local: string) => `+${PREFIX} ${formatMlPhone(local)}`;

/** Lien d'appel : « tel:+22376123456 » */
export const telLink = (local: string) => `tel:+${PREFIX}${local}`;

/** Numéro pour wa.me : chiffres seuls, indicatif compris, sans « + » ni espace. */
export const waNumber = (local: string) => `${PREFIX}${local}`;

/** Messages d'erreur et aide de saisie, partagés client / serveur. */
export const phoneHint = "8 chiffres, ex. 76 12 34 56 (l'indicatif +223 est facultatif)";
export const phoneError = "Numéro malien invalide : 8 chiffres, ex. 76 12 34 56.";
export const phonePlaceholder = "76 12 34 56";
