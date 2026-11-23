import { siteConfig } from "@/config/site";

/** Construit un lien wa.me avec un message pré-rempli. */
export function whatsappLink(message?: string, phone: string = siteConfig.whatsapp) {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
