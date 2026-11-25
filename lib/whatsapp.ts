import { siteConfig } from "@/config/site";

/**
 * Construit un lien wa.me avec un message pré-rempli. `phone` est au format
 * international (« 22370000000 ») : espaces, « + » et tirets sont retirés.
 */
export function whatsappLink(message?: string, phone: string = siteConfig.whatsapp) {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
