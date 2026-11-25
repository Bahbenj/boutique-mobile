/**
 * Contenu éditorial de la page d'accueil. Les images Unsplash sont des
 * placeholders : remplacer par les photos du magasin (dans /public/images).
 */
import { deliveryZones, paymentMethods, siteConfig } from "@/config/site";
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
    label: "Smartphones",
    title: "Nouveau.",
    text: "Tecno, Samsung et Apple : les derniers modèles, scellés, facturés et garantis 12 mois.",
    image: unsplash("1592750475338-74b7b21085ab", 2000),
    alt: "Dos d'un smartphone graphite sur fond sombre",
    focus: "60% 40%",
  },
  {
    label: "Service après-vente",
    title: "Servi.",
    text: "Réparation, déblocage, transfert de données : un service après-vente qui fait la différence.",
    image: unsplash("1581092921461-eab62e97a780", 2000),
    alt: "Technicien réparant un smartphone sous une lampe",
    focus: "50% 45%",
  },
  {
    label: "Accessoires",
    title: "Équipé.",
    text: "AirPods, casques, coques, chargeurs rapides. Pose du verre trempé offerte en magasin.",
    image: unsplash("1590658268037-6bf12165a8df", 2000),
    alt: "Trois paires d'écouteurs sans fil et leurs boîtiers",
    focus: "50% 40%",
  },
  {
    label: "Livraison",
    title: "Livré.",
    text: "Partout au Mali, frais selon la zone. Vous payez à la livraison, après avoir vérifié le colis.",
    image: unsplash("1616348436168-de43ad0db179", 2000),
    alt: "Dos d'un smartphone vert sauge en gros plan",
    focus: "40% 50%",
  },
];

// --- Nos services (section #services) -----------------------------------------

export type ServiceIcon = "repair" | "unlock" | "transfer" | "screen" | "tradein" | "delivery" | "warranty";
export type Service = { icon: ServiceIcon; title: string; text: string };

/** TODO client : valider les libellés et conditions de chaque service. */
export const services: Service[] = [
  { icon: "repair", title: "Réparation", text: "Écran, batterie, connecteur de charge, vitre arrière : souvent réparé dans l'heure." },
  { icon: "unlock", title: "Déblocage", text: "Déblocage opérateur, code ou schéma oublié, sur présentation de la facture ou d'une pièce d'identité." },
  { icon: "transfer", title: "Transfert de données", text: "Contacts, photos, WhatsApp : tout passe sur votre nouveau téléphone, en magasin." },
  { icon: "screen", title: "Protection d'écran", text: "Pose de verre trempé et de film, sans bulle, pendant que vous attendez." },
  { icon: "tradein", title: "Reprise d'ancien téléphone", text: "Votre ancien téléphone est estimé en magasin et déduit du prix du nouveau." },
  { icon: "delivery", title: "Livraison", text: "Dans tout le Mali, frais selon la zone. Paiement à la livraison." },
  { icon: "warranty", title: "Garantie", text: `${siteConfig.warrantyMonths.new} mois sur le neuf, ${siteConfig.warrantyMonths.used} mois sur l'occasion et les réparations.` },
];

/** Points forts du service après-vente (encadré mis en avant). */
export const afterSalesPoints = [
  "Un interlocuteur joignable sur WhatsApp, même après l'achat",
  "Diagnostic gratuit en magasin",
  "Prise en charge de la garantie sans démarches pour vous",
];

export type RepairService = { name: string; from: number; delay: string };

/** TODO client : tarifs « à partir de » réels (en FCFA). */
export const repairServices: RepairService[] = [
  { name: "Remplacement d'écran", from: 25_000, delay: "1 h" },
  { name: "Remplacement de batterie", from: 15_000, delay: "45 min" },
  { name: "Connecteur de charge", from: 10_000, delay: "1 h" },
  { name: "Déblocage / code oublié", from: 5_000, delay: "Sur devis" },
  { name: "Transfert de données", from: 2_000, delay: "30 min" },
];

export const repairImage = {
  src: unsplash("1581092921461-eab62e97a780", 1400),
  alt: "Technicien réparant un smartphone sous une lampe",
};

// --- Comment commander ------------------------------------------------------

const onlyCod = paymentMethods.filter((m) => m.enabled).every((m) => m.id === "cod");

export const orderSteps = [
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
    text: onlyCod
      ? "Le livreur vous remet le colis : vous vérifiez, puis vous payez en espèces."
      : "Le livreur vous remet le colis : vous vérifiez, puis vous payez en espèces. Ou réglez par Mobile Money.",
  },
];

// --- Avis clients -----------------------------------------------------------

export type Review = { name: string; city: string; text: string; rating: number; product?: string };

/**
 * Avis d'EXEMPLE, affichés seulement tant que Supabase n'est pas branché.
 * Une fois la base en place, les avis se gèrent dans /admin/avis (table
 * public.reviews) et ceux-ci ne sont plus utilisés. TODO client : vrais avis.
 */
export const reviews: Review[] = [
  {
    name: "Moussa T.",
    city: "Bamako",
    rating: 5,
    product: "Tecno Camon 30",
    text: "Commandé le soir, appelé le lendemain matin, livré l'après-midi. Téléphone scellé avec la facture.",
  },
  {
    name: "Aminata D.",
    city: "Sikasso",
    rating: 5,
    product: "iPhone 13 occasion",
    text: "J'avais peur de prendre de l'occasion à distance. Batterie comme annoncé, aucune rayure visible.",
  },
  {
    name: "Ibrahim K.",
    city: "N'Tabacoro",
    rating: 5,
    product: "Changement d'écran",
    text: "Écran changé en moins d'une heure. Et quand j'ai eu un souci une semaine après, ils ont tout réglé.",
  },
  {
    name: "Fatoumata C.",
    city: "Ségou",
    rating: 4,
    product: "AirPods Pro",
    text: "Bon prix et livraison rapide jusqu'à Ségou. J'ai payé à la livraison, sans surprise.",
  },
];

// --- FAQ --------------------------------------------------------------------

export type Faq = { q: string; a: string };

const { warrantyMonths, delivery } = siteConfig;
const bamakoFees = deliveryZones.filter((z) => z.active && z.group === "bamako").map((z) => z.fee);
const regionFees = deliveryZones.filter((z) => z.active && z.group === "region").map((z) => z.fee);

/** TODO client : valider la politique de retour (7 jours) et les délais. */
export const faqs: Faq[] = [
  {
    q: "Comment puis-je payer ?",
    a: onlyCod
      ? "Vous ne payez rien en ligne : vous payez en espèces à la livraison, après avoir vérifié le téléphone devant le livreur."
      : "Vous ne payez rien en ligne. Au choix : en espèces à la livraison (vous vérifiez le téléphone devant le livreur, puis vous payez), ou par Mobile Money : nous vous envoyons les instructions par WhatsApp après confirmation.",
  },
  {
    q: "Livrez-vous partout au Mali ?",
    a: `Oui, dans tout le Mali. Les frais dépendent de la zone : à Bamako, dès ${formatPrice(Math.min(...bamakoFees))} selon la commune, livré en 24 h. Dans les régions, dès ${formatPrice(Math.min(...regionFees))}, en 2 à 7 jours selon la distance. ${delivery.freeFrom != null ? `La livraison est offerte dès ${formatPrice(delivery.freeFrom)} d'achat. ` : ""}Le retrait au magasin de N'Tabacoro est gratuit.`,
  },
  {
    q: "Que comprend le service après-vente ?",
    a: "Après l'achat, vous gardez un interlocuteur sur WhatsApp. Diagnostic gratuit en magasin, prise en charge de la garantie, réparation, transfert de données, déblocage : nous nous occupons de tout.",
  },
  {
    q: "Les téléphones d'occasion sont-ils fiables ?",
    a: `Chaque appareil est testé sur 30 points (écran, batterie, caméras, réseau, Face ID / empreinte…), réinitialisé et nettoyé. L'état et la santé de la batterie sont indiqués sur chaque fiche. Garantie ${warrantyMonths.used} mois.`,
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
