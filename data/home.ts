/**
 * Contenu éditorial de la page d'accueil. Les images Unsplash sont des
 * placeholders : remplacer par les photos du magasin (dans /public/images).
 */
import { siteConfig } from "@/config/site";

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
    label: "Neufs",
    title: "Nouveau.",
    text: "Les derniers iPhone, Samsung et Xiaomi, scellés, facturés et garantis 12 mois.",
    image: unsplash("1592750475338-74b7b21085ab", 2000),
    alt: "Dos d'un iPhone graphite sur fond sombre",
    focus: "60% 40%",
  },
  {
    label: "Occasion",
    title: "Garanti.",
    text: "Testés sur 30 points, batterie contrôlée, garantis 3 mois. Le haut de gamme sans le prix du neuf.",
    image: unsplash("1610945265064-0e34e5519bbf", 2000),
    alt: "Smartphone Samsung argenté posé sur sa boîte",
    focus: "50% 45%",
  },
  {
    label: "Accessoires",
    title: "Équipé.",
    text: "Coques, chargeurs rapides, écouteurs et verres trempés. Pose de la protection offerte en magasin.",
    image: unsplash("1609081219090-a6d81d3085bf", 2000),
    alt: "Casque audio et écouteurs sans fil sur fond orange",
    focus: "50% 40%",
  },
  {
    label: "Livraison",
    title: "Livré.",
    text: "Partout en Tunisie en 24 à 72 h. Vous payez à la réception, rien avant.",
    image: unsplash("1616348436168-de43ad0db179", 2000),
    alt: "Dos d'un iPhone vert sauge en gros plan",
    focus: "40% 50%",
  },
];

// --- Réparation (section #reparation) ---------------------------------------

export type RepairService = { name: string; from: number; delay: string };

/** TODO client : tarifs « à partir de » réels (en DT). */
export const repairServices: RepairService[] = [
  { name: "Remplacement d'écran", from: 149, delay: "1 h" },
  { name: "Remplacement de batterie", from: 89, delay: "45 min" },
  { name: "Connecteur de charge", from: 59, delay: "1 h" },
  { name: "Vitre arrière", from: 119, delay: "2 h" },
  { name: "Caméra / Face ID", from: 129, delay: "Sur devis" },
  { name: "Désoxydation", from: 69, delay: "24 h" },
];

export const repairImage = {
  src: unsplash("1581092921461-eab62e97a780", 1400),
  alt: "Technicien réparant un smartphone sous une lampe",
};

// --- Comment commander ------------------------------------------------------

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
    text: "Le livreur vous remet le colis : vous vérifiez, puis vous payez en espèces. Ou retirez-le en magasin.",
  },
];

// --- Avis clients -----------------------------------------------------------

export type Review = { name: string; city: string; text: string; rating: number; product?: string };

/**
 * TODO client : PLACEHOLDERS. Remplacer par de vrais avis (Google Business,
 * Facebook) avant la mise en ligne, ou vider le tableau pour masquer la section.
 */
export const reviews: Review[] = [
  {
    name: "Amine B.",
    city: "Ariana",
    rating: 5,
    product: "iPhone 13",
    text: "Commandé le soir, appelé le lendemain matin, livré l'après-midi. Le téléphone était scellé avec la facture.",
  },
  {
    name: "Sarra M.",
    city: "Sfax",
    rating: 5,
    product: "iPhone 12 Pro occasion",
    text: "J'avais peur de prendre de l'occasion à distance. Batterie à 88 % comme annoncé, aucune rayure visible.",
  },
  {
    name: "Youssef K.",
    city: "Tunis",
    rating: 5,
    product: "Changement d'écran",
    text: "Écran changé en moins d'une heure pendant que je faisais mes courses. Prix annoncé respecté.",
  },
  {
    name: "Ines H.",
    city: "Sousse",
    rating: 4,
    product: "AirPods Pro",
    text: "Bon prix et livraison rapide. Le livreur a attendu que je vérifie avant de payer.",
  },
];

// --- FAQ --------------------------------------------------------------------

export type Faq = { q: string; a: string };

const { warrantyMonths, delivery } = siteConfig;
const homeDelivery = delivery.options.find((o) => o.id === "home");

/** TODO client : valider la politique de retour (7 jours) et les délais. */
export const faqs: Faq[] = [
  {
    q: "Comment fonctionne le paiement à la livraison ?",
    a: "Vous ne payez rien en ligne. Le livreur vous remet le colis, vous l'ouvrez et vérifiez le téléphone devant lui, puis vous réglez en espèces.",
  },
  {
    q: "Quels sont les délais et frais de livraison ?",
    a: `Nous livrons dans les 24 gouvernorats en ${homeDelivery?.delay ?? "24 à 72 h"}, pour ${homeDelivery?.price ?? 8} DT. La livraison est offerte dès ${delivery.freeFrom} DT d'achat. Le retrait en magasin est gratuit.`,
  },
  {
    q: "Les téléphones d'occasion sont-ils fiables ?",
    a: `Chaque appareil est testé sur 30 points (écran, batterie, caméras, réseau, Face ID / empreinte…), réinitialisé et nettoyé. L'état et la santé de la batterie sont indiqués sur chaque fiche. Garantie ${warrantyMonths.used} mois.`,
  },
  {
    q: "Quelle garantie sur les téléphones neufs ?",
    a: `Les téléphones neufs sont scellés, livrés avec facture et garantis ${warrantyMonths.new} mois. En cas de panne, déposez-le en magasin : nous gérons la prise en charge.`,
  },
  {
    q: "Puis-je échanger ou retourner un produit ?",
    a: "Oui, sous 7 jours si le produit est dans son état d'origine, avec sa boîte et ses accessoires. Contactez-nous sur WhatsApp pour organiser l'échange.",
  },
];
