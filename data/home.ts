/**
 * Contenu éditorial (accueil, page Réparation). Les images Unsplash sont des
 * placeholders sobres en attendant les photos du magasin (public/photos, voir
 * son README). Ne jamais charger d'image depuis Facebook.
 */
import { siteConfig, type DeliveryZone, type PaymentMethod } from "@/config/site";
import { formatPrice } from "@/lib/utils";

export const unsplash = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export type HeroScene = {
  label: string; // badge en haut à gauche
  title: string; // grand titre (court : ≤ 9 caractères pour tenir à 360px)
  text: string;
  image: string;
  alt: string;
  /** Cadrage de l'image sur mobile (object-position). */
  focus?: string;
};

export const heroScenes: HeroScene[] = [
  {
    label: "Téléphones",
    title: "Nouveau.",
    text: "Samsung, Tecno et bien d'autres : trouvez votre prochain smartphone chez nous.",
    image: unsplash("1592750475338-74b7b21085ab", 2000),
    alt: "Dos d'un smartphone graphite sur fond sombre",
    focus: "60% 40%",
  },
  {
    label: "Accessoires",
    title: "Équipé.",
    text: "Écouteurs, casques, montres connectées, chargeurs : tout ce qu'il faut à votre téléphone.",
    image: unsplash("1590658268037-6bf12165a8df", 2000),
    alt: "Écouteurs sans fil et leurs boîtiers",
    focus: "50% 40%",
  },
  {
    label: "Atelier",
    title: "Réparé.",
    text: "Écran cassé, téléphone bloqué ? Apportez-le-nous, on s'en occupe.",
    image: unsplash("1581092921461-eab62e97a780", 2000),
    alt: "Technicien réparant un smartphone sous une lampe",
    focus: "50% 45%",
  },
  {
    label: "Livraison",
    title: "Livré.",
    text: "Commandez en ligne, nous livrons partout au Mali. Vous payez à la réception.",
    image: unsplash("1610945265064-0e34e5519bbf", 2000),
    alt: "Smartphone posé sur sa boîte",
    focus: "50% 45%",
  },
];

// --- Services (accueil #services et page /reparation) ---------------------------

export type ServiceIcon = "repair" | "flash" | "unlock" | "transfer" | "setup" | "shop";
export type Service = { icon: ServiceIcon; title: string; text: string };

/** D'après la page Facebook. TODO client : valider les libellés et conditions. */
export const services: Service[] = [
  { icon: "repair", title: "Réparation", text: "Écran, vitre, micro-soudure, remplacement par kit." },
  { icon: "flash", title: "Flashage et décodage", text: "Remise à neuf du système de votre téléphone." },
  {
    icon: "unlock",
    title: "Déblocage",
    // Formulation imposée : jamais « bypass », « supprimer le FRP » ni « MDM » (voir AGENTS.md)
    text: "Déblocage de votre propre appareil (compte oublié, verrouillage d'entreprise) sur présentation d'une preuve d'achat ou de propriété. Nous nous réservons le droit de refuser une demande.",
  },
  { icon: "transfer", title: "Transfert de données", text: "Contacts, photos, applications : tout passe sur votre nouveau téléphone." },
  { icon: "setup", title: "Aide à la configuration", text: "Comptes, WhatsApp, réglages : on vous aide à bien démarrer." },
  { icon: "shop", title: "Coques, écouteurs et gadgets", text: "Tout pour protéger et équiper votre téléphone, en magasin et en ligne." },
];

/** Points forts du service après-vente (encadré mis en avant). */
export const afterSalesPoints = [
  "Un interlocuteur joignable sur WhatsApp, même après l'achat",
  "Un devis avant toute réparation",
  "Un suivi de votre téléphone jusqu'à ce qu'il fonctionne",
];

/** Parcours de réparation, page /reparation. */
export const repairSteps = [
  { title: "Diagnostic", text: "Apportez votre téléphone ou décrivez la panne sur WhatsApp, photo à l'appui." },
  { title: "Devis", text: "Nous vous annonçons le prix avant d'intervenir. Vous décidez." },
  { title: "Réparation", text: "Votre téléphone est réparé et vérifié avec vous à la remise." },
];

/**
 * Vidéos de réparation (page /reparation). Vide pour l'instant : la section
 * affiche un emplacement réservé et renvoie vers TikTok. TODO client : déposer
 * les vidéos (MP4, 720p, quelques Mo) dans public/photos/videos/ avec une
 * image d'aperçu, puis les ajouter ici.
 */
export type RepairVideo = { title: string; src: string; poster: string };
export const repairVideos: RepairVideo[] = [];

export const repairImage = {
  src: unsplash("1581092921461-eab62e97a780", 1400),
  alt: "Technicien réparant un smartphone sous une lampe",
};

// --- Comment commander ------------------------------------------------------

/** Seul le paiement à la livraison est proposé (réglage admin ou config). */
export const isOnlyCod = (payments: Pick<PaymentMethod, "id">[]) => payments.every((m) => m.id === "cod");

export function buildOrderSteps(payments: Pick<PaymentMethod, "id">[]) {
  return [
    {
      title: "Choisissez",
      text: "Ajoutez votre téléphone au panier et laissez votre nom, numéro et adresse. Aucun paiement en ligne.",
    },
    {
      title: "On vous appelle",
      text: "Un conseiller confirme la commande, la couleur et l'adresse par téléphone ou WhatsApp, en général dans l'heure.",
    },
    {
      title: "Payez à la réception",
      text: isOnlyCod(payments)
        ? "Le livreur vous remet le colis : vous vérifiez, puis vous payez en espèces."
        : "Le livreur vous remet le colis : vous vérifiez, puis vous payez en espèces. Ou réglez par Mobile Money.",
    },
  ];
}

// --- Avis clients -----------------------------------------------------------

export type Review = { name: string; city: string; text: string; rating: number; product?: string };

/**
 * Les avis se gèrent dans /admin/avis (table public.reviews). Aucun avis
 * d'exemple : la section reste masquée tant qu'aucun vrai avis n'est publié.
 */
export const reviewRequestMessage = "Bonjour Mobile Empire, je souhaite laisser un avis sur mon achat / ma réparation : …";

// --- FAQ --------------------------------------------------------------------

export type Faq = { q: string; a: string };

/**
 * Réglages dont dépendent la FAQ et les étapes de commande : ceux de l'admin
 * (lib/storefront.ts → getCheckoutSettings), ou par défaut config/site.ts.
 */
export type ShopTerms = {
  zones: Pick<DeliveryZone, "group" | "fee">[]; // zones actives
  payments: Pick<PaymentMethod, "id">[]; // modes activés
  freeFrom: number | null;
  pickup: { enabled: boolean };
};

const minFee = (zones: ShopTerms["zones"], group: DeliveryZone["group"]) => {
  const fees = zones.filter((z) => z.group === group).map((z) => z.fee);
  return fees.length ? Math.min(...fees) : null;
};

function deliveryAnswer({ zones, freeFrom, pickup }: ShopTerms) {
  const bamako = minFee(zones, "bamako");
  const region = minFee(zones, "region");
  return [
    zones.length ? "Oui, dans tout le Mali. Les frais dépendent de la zone :" : "La livraison est momentanément suspendue.",
    bamako != null ? `à Bamako, dès ${formatPrice(bamako)} selon la commune, livré en 24 h.` : "",
    region != null ? `Dans les régions, dès ${formatPrice(region)}, en 2 à 7 jours selon la distance.` : "",
    freeFrom != null && zones.length ? `La livraison est offerte dès ${formatPrice(freeFrom)} d'achat.` : "",
    pickup.enabled ? `Le retrait au magasin de ${siteConfig.address.district} est gratuit.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** TODO client : valider la politique de retour (7 jours) et les délais. */
export function buildFaqs(terms: ShopTerms): Faq[] {
  return [
    {
      q: "Comment puis-je payer ?",
      a: isOnlyCod(terms.payments)
        ? "Vous ne payez rien en ligne : vous payez en espèces à la livraison, après avoir vérifié le téléphone devant le livreur."
        : "Vous ne payez rien en ligne. Au choix : en espèces à la livraison (vous vérifiez le téléphone devant le livreur, puis vous payez), ou par Mobile Money : nous vous envoyons les instructions par WhatsApp après confirmation.",
    },
    { q: "Livrez-vous partout au Mali ?", a: deliveryAnswer(terms) },
    {
      q: "Que comprend le service après-vente ?",
      a: "Après l'achat, vous gardez un interlocuteur sur WhatsApp. Réparation, flashage, déblocage, transfert de données, aide à la configuration : nous nous occupons de votre téléphone, avec un devis avant toute intervention.",
    },
    {
      q: "Reprenez-vous mon ancien téléphone ?",
      a: "Oui. Apportez-le en magasin : nous l'estimons sur place et le montant est déduit du prix de votre nouveau téléphone.",
    },
    {
      q: "Puis-je échanger ou retourner un produit ?",
      a: "Oui, sous 7 jours si le produit est dans son état d'origine, avec sa boîte et ses accessoires. Contactez-nous sur WhatsApp pour organiser l'échange.",
    },
  ];
}
