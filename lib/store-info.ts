import { siteConfig } from "@/config/site";

/**
 * Infos de la boutique affichées sur le site (contact, adresse, horaires,
 * réseaux), réglées dans /admin/parametres (settings.store) avec repli sur
 * config/site.ts. Fonctions pures : utilisables côté serveur et navigateur.
 */
export type StoreInfo = {
  /** Numéro WhatsApp international, chiffres seuls : « 22363515582 ». */
  whatsapp: string;
  /** Numéro principal affiché : « +223 63 51 55 82 ». */
  phone: string;
  /** Tous les numéros affichés, le principal en premier. */
  phones: string[];
  email: string;
  address: { street: string; district: string; city: string };
  hours: { days: string; time: string }[];
  social: { facebook: string; tiktok: string; instagram: string };
  /** Lien Google Maps (« Partager » dans l'appli) pour l'itinéraire ; vide = calculé depuis l'adresse. */
  mapUrl: string;
};

export type Announcement = { text: string; link: string };

export const fallbackStoreInfo = (): StoreInfo => ({
  whatsapp: siteConfig.whatsapp,
  phone: siteConfig.phone,
  phones: [...siteConfig.phones],
  email: siteConfig.email,
  address: { street: siteConfig.address.street, district: siteConfig.address.district, city: siteConfig.address.city },
  hours: siteConfig.hours.map((h) => ({ ...h })),
  social: { facebook: siteConfig.social.facebook, tiktok: siteConfig.social.tiktok, instagram: "" },
  mapUrl: "",
});

/** Fusion des réglages en base (clé « store ») avec le repli : un champ vide ou invalide garde la valeur par défaut. */
export function mergeStoreInfo(raw: unknown): StoreInfo {
  const base = fallbackStoreInfo();
  if (!raw || typeof raw !== "object") return base;
  const v = raw as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  const address = (v.address ?? {}) as Record<string, unknown>;
  const social = (v.social ?? {}) as Record<string, unknown>;
  const phones = Array.isArray(v.phones) ? v.phones.map(str).filter(Boolean) : [];
  const hours = Array.isArray(v.hours)
    ? v.hours.map((h) => ({ days: str((h as Record<string, unknown>)?.days), time: str((h as Record<string, unknown>)?.time) })).filter((h) => h.days && h.time)
    : [];
  const phone = str(v.phone) || base.phone;
  return {
    whatsapp: str(v.whatsapp).replace(/\D/g, "") || base.whatsapp,
    phone,
    phones: phones.length ? phones : [phone],
    email: "email" in v ? str(v.email) : base.email,
    address: {
      street: "street" in address ? str(address.street) : base.address.street,
      district: str(address.district) || base.address.district,
      city: str(address.city) || base.address.city,
    },
    hours: hours.length ? hours : base.hours,
    social: {
      facebook: "facebook" in social ? str(social.facebook) : base.social.facebook,
      tiktok: "tiktok" in social ? str(social.tiktok) : base.social.tiktok,
      instagram: str(social.instagram),
    },
    mapUrl: str(v.map_url),
  };
}

/** « N'Tabacoro, près de l'école fondamentale, Bamako » */
export const storeAddressOf = (s: StoreInfo) => [s.address.district, s.address.street.toLowerCase(), s.address.city].filter(Boolean).join(", ");

/** Itinéraire Google Maps : lien réglé dans l'admin, sinon calculé depuis l'adresse. */
export const directionsOf = (s: StoreInfo) =>
  s.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.address.district}, ${s.address.city}, Mali`)}`;

/** Carte intégrée (contact, accueil), d'après l'adresse. */
export const mapEmbedOf = (s: StoreInfo) =>
  `https://www.google.com/maps?q=${encodeURIComponent([s.address.district, s.address.city, "Mali"].filter(Boolean).join(", "))}&output=embed`;

/** « @mobile__empire » d'après le lien TikTok. */
export const tiktokHandleOf = (url: string) => {
  const m = url.match(/tiktok\.com\/(@[\w.]+)/i);
  return m ? m[1] : "TikTok";
};
