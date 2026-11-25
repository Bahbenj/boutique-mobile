/**
 * Configuration centrale du site.
 * Tout le contenu propre au commerçant se modifie ici : identité, couleurs,
 * contact, horaires, livraison, paiement. Les composants ne codent rien en dur.
 *
 * Une fois Supabase branché (étape 4), les zones de livraison, les modes de
 * paiement et les infos du magasin sont lus depuis la base (modifiables dans
 * /admin/parametres) ; les valeurs ci-dessous servent de repli et de modèle.
 */

export const siteConfig = {
  // --- Identité -----------------------------------------------------------
  name: "Mobile Empire",
  /** Monogramme du logo texte, en attendant le vrai logo (voir `logo`). */
  shortName: "ME",
  slogan: "Vendre avec passion, servir avec excellence.",
  tagline: "Smartphones & accessoires",
  description:
    "Smartphones Tecno, Samsung et Apple neufs et d'occasion, AirPods, casques, coques et accessoires. Réparation, déblocage et service après-vente à N'Tabacoro, Bamako. Livraison dans tout le Mali, paiement à la livraison.",
  /** Année d'ouverture : affichée « Depuis 2018 ». */
  since: 2018,
  url: "https://www.example.com", // TODO client : domaine définitif (SEO, sitemap, OG)
  locale: "fr-ML",
  /** Fuseau du magasin : « aujourd'hui », statistiques, dates des commandes. */
  timeZone: "Africa/Bamako",
  currency: "XOF", // franc CFA (UEMOA), sans décimales
  currencyLabel: "FCFA",
  /** Chemin d'un logo image dans /public (ex. "/logo.svg"). null = logo texte « ME ». TODO client */
  logo: null as string | null,

  // --- Couleurs (injectées en variables CSS dans app/layout.tsx) ------------
  // Thème sombre « tech ». TODO client : nuances exactes à confirmer.
  // Changer une valeur ici suffit : cartes, bordures, survols et versions
  // atténuées en sont dérivés (app/globals.css). Garder un contraste AA :
  // texte ≥ 4,5:1 sur canvas et surface. Charte : ni rouge ni jaune.
  theme: {
    canvas: "#07080C", // fond de page (noir)
    surface: "#12141B", // cartes (anthracite)
    raised: "#1B1E27", // éléments posés sur une carte
    fg: "#EEF1F6", // texte principal
    muted: "#A1A9BA", // texte secondaire
    accent: "#3D8BFF", // bleu électrique : boutons, liens, focus
    onAccent: "#07080C", // texte posé sur l'accent
    gold: "#B76E79", // rose doré : badges, soulignements, détails
    onGold: "#07080C", // texte posé sur le rose doré
    danger: "#B8A2FF", // alertes et erreurs (lavande, jamais de rouge)
    success: "#3DDBC3", // succès, « en stock » (turquoise)
  },

  // --- Contact ------------------------------------------------------------
  /** Indicatif du Mali ; les numéros locaux ont 8 chiffres. */
  phonePrefix: "223",
  /** TODO client : confirmer que ce numéro est bien celui de WhatsApp (format international, sans « + » ni espaces). */
  whatsapp: "22363515582",
  /** Numéro principal (appels, barre mobile). */
  phone: "+223 63 51 55 82",
  /** Tous les numéros affichés (pied de page, contact). */
  phones: ["+223 63 51 55 82", "+223 74 05 86 18"],
  email: "diarraousmane719@gmail.com",
  address: {
    street: "", // TODO client : rue ou repère précis (facultatif)
    district: "N'Tabacoro",
    city: "Bamako",
    country: "ML",
  },
  /** URL d'intégration Google Maps (Partager → Intégrer une carte). TODO client : remplacer par l'épingle exacte du magasin. */
  mapEmbedUrl: "https://www.google.com/maps?q=N%27Tabacoro%2C+Bamako%2C+Mali&output=embed",
  hours: [{ days: "Tous les jours", time: "8h – 21h" }],
  social: {
    facebook: "https://www.facebook.com/share/14yBZGGk9Mi/?mibextid=wwXIfr",
    tiktok: "https://www.tiktok.com/@mobile__empire",
    tiktokHandle: "@mobile__empire",
  },

  // --- Activité -----------------------------------------------------------
  features: {
    services: true, // affiche la section « Nos services » (réparation, SAV…)
  },
  warrantyMonths: { new: 12, used: 3 },

  // --- Livraison (FCFA) -------------------------------------------------------
  delivery: {
    freeFrom: 100_000, // TODO client : livraison offerte dès ce montant (null = jamais)
    pickup: { label: "Retrait en magasin", delay: "Sous 2 h" },
  },
} as const;

export type SiteConfig = typeof siteConfig;

/**
 * Zones de livraison : District de Bamako (communes) puis régions.
 * Valeurs d'exemple, reprises par la migration Supabase et modifiables dans
 * l'admin (frais, délai, activation). TODO client : tarifs réels.
 * Kidal, Ménaka et Taoudénit sont désactivées par défaut (souvent non desservies).
 */
export type DeliveryZone = {
  id: string; // identifiant stable (aussi utilisé en base)
  name: string;
  group: "bamako" | "region";
  fee: number;
  delay: string;
  active: boolean;
};

export const deliveryZones: DeliveryZone[] = [
  { id: "bamako-commune-1", name: "Bamako – Commune I", group: "bamako", fee: 1_500, delay: "24 h", active: true },
  { id: "bamako-commune-2", name: "Bamako – Commune II", group: "bamako", fee: 1_500, delay: "24 h", active: true },
  { id: "bamako-commune-3", name: "Bamako – Commune III", group: "bamako", fee: 1_500, delay: "24 h", active: true },
  { id: "bamako-commune-4", name: "Bamako – Commune IV", group: "bamako", fee: 1_500, delay: "24 h", active: true },
  { id: "bamako-commune-5", name: "Bamako – Commune V", group: "bamako", fee: 2_000, delay: "24 h", active: true },
  { id: "bamako-commune-6", name: "Bamako – Commune VI", group: "bamako", fee: 2_000, delay: "24 h", active: true },
  { id: "kayes", name: "Région de Kayes", group: "region", fee: 5_000, delay: "3 à 5 jours", active: true },
  { id: "koulikoro", name: "Région de Koulikoro", group: "region", fee: 3_000, delay: "1 à 2 jours", active: true },
  { id: "sikasso", name: "Région de Sikasso", group: "region", fee: 4_000, delay: "2 à 4 jours", active: true },
  { id: "segou", name: "Région de Ségou", group: "region", fee: 4_000, delay: "2 à 4 jours", active: true },
  { id: "mopti", name: "Région de Mopti", group: "region", fee: 5_000, delay: "3 à 5 jours", active: true },
  { id: "tombouctou", name: "Région de Tombouctou", group: "region", fee: 7_500, delay: "5 à 7 jours", active: true },
  { id: "gao", name: "Région de Gao", group: "region", fee: 7_500, delay: "5 à 7 jours", active: true },
  { id: "kidal", name: "Région de Kidal", group: "region", fee: 10_000, delay: "Sur demande", active: false },
  { id: "menaka", name: "Région de Ménaka", group: "region", fee: 10_000, delay: "Sur demande", active: false },
  { id: "taoudenit", name: "Région de Taoudénit", group: "region", fee: 10_000, delay: "Sur demande", active: false },
];

/**
 * Modes de paiement. Pas de paiement en ligne : le client choisit son mode,
 * le commerçant lui envoie les instructions par WhatsApp. Pour l'instant,
 * paiement à la livraison uniquement : les autres modes sont prêts mais
 * désactivés, et s'activent dans /admin/parametres (numéros à y saisir). TODO client
 */
export type PaymentMethod = {
  id: "cod" | "orange_money" | "moov_money" | "wave" | "sama_money" | "virement";
  label: string;
  /** Numéro Mobile Money ou coordonnées bancaires du magasin. */
  account: string;
  /** Affiché au client au moment de choisir. */
  instructions: string;
  enabled: boolean;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "cod", label: "Paiement à la livraison", account: "", instructions: "Vous payez en espèces au livreur, après avoir vérifié le colis.", enabled: true },
  { id: "orange_money", label: "Orange Money", account: "+223 70 00 00 00", instructions: "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", enabled: false },
  { id: "moov_money", label: "Moov Money", account: "+223 60 00 00 00", instructions: "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", enabled: false },
  { id: "wave", label: "Wave", account: "+223 70 00 00 00", instructions: "Nous vous envoyons le lien ou le numéro Wave par WhatsApp après confirmation.", enabled: false },
  { id: "sama_money", label: "Sama Money", account: "+223 70 00 00 00", instructions: "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", enabled: false },
  { id: "virement", label: "Virement bancaire", account: "", instructions: "Nous vous envoyons nos coordonnées bancaires par WhatsApp après confirmation.", enabled: false },
];

export const paymentMethodIds = paymentMethods.map((m) => m.id) as [PaymentMethod["id"], ...PaymentMethod["id"][]];
export const paymentLabel = (id: string) => paymentMethods.find((m) => m.id === id)?.label ?? id;

/** Adresse sur une ligne : « N'Tabacoro, Bamako » (la rue est facultative). */
export const storeAddress = [siteConfig.address.street, siteConfig.address.district, siteConfig.address.city].filter(Boolean).join(", ");

/** Lien Google Maps « itinéraire » vers le magasin. */
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${storeAddress}, Mali`)}`;

/** « +223 63 51 55 82 » → « tel:+22363515582 » */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
