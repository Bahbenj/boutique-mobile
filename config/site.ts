/**
 * Configuration centrale du site.
 * Tout le contenu propre au commerçant se modifie ici : identité, couleurs,
 * contact, horaires, livraison. Les composants ne doivent rien coder en dur.
 */

export const siteConfig = {
  // --- Identité -----------------------------------------------------------
  name: "Boutique Mobile", // TODO client : [NOM DU MAGASIN]
  shortName: "BM", // monogramme utilisé dans le logo texte
  tagline: "Téléphones & accessoires",
  description:
    "Téléphones neufs et d'occasion garantis, accessoires et réparation. Commande en ligne, paiement à la livraison partout en Tunisie.",
  url: "https://www.example.tn", // TODO client : domaine définitif (SEO, sitemap, OG)
  locale: "fr-TN",
  currency: "TND",
  /** Chemin d'un logo image dans /public. Laisser null pour le logo texte. */
  logo: null as string | null,

  // --- Couleurs (injectées en variables CSS dans app/layout.tsx) ------------
  colors: {
    cream: "#F4F1EA", // fond principal
    ink: "#141414", // texte / blocs sombres
    accent: "#FF7A1A", // orange / ambre de la marque
    accentInk: "#141414", // texte posé sur l'accent (contraste AA)
  },

  // --- Contact ------------------------------------------------------------
  whatsapp: "21600000000", // TODO client : format international sans « + » ni espaces
  phone: "+216 00 000 000",
  email: "contact@example.tn",
  address: {
    street: "Avenue Habib Bourguiba", // TODO client
    city: "Tunis", // TODO client : [VILLE]
    governorate: "Tunis",
    postalCode: "1000",
    country: "TN",
  },
  /** URL d'intégration Google Maps (Partager → Intégrer une carte). */
  mapEmbedUrl:
    "https://www.google.com/maps?q=Avenue+Habib+Bourguiba+Tunis&output=embed",
  hours: [
    { days: "Lundi – Samedi", time: "09:00 – 20:00" },
    { days: "Dimanche", time: "10:00 – 14:00" },
  ],
  social: {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/",
  },

  // --- Activité -----------------------------------------------------------
  features: {
    repair: true, // affiche la section / page réparation
    cardPayment: false, // prévu pour plus tard (Konnect, Flouci, ClicToPay…)
  },
  warrantyMonths: { new: 12, used: 3 },

  // --- Livraison (montants en TND) --------------------------------------------
  delivery: {
    freeFrom: 300, // livraison offerte à partir de ce montant
    options: [
      { id: "home", label: "Livraison à domicile", price: 8, delay: "24 – 72 h" },
      { id: "express", label: "Express (Grand Tunis)", price: 12, delay: "Le jour même" },
      { id: "pickup", label: "Retrait en magasin", price: 0, delay: "Sous 2 h" },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
export type DeliveryOptionId = (typeof siteConfig.delivery.options)[number]["id"];

/** Les 24 gouvernorats tunisiens, pour le formulaire de commande. */
export const governorates = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
  "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba",
  "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana",
  "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const;
