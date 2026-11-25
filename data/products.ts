/**
 * Catalogue. Données statiques en attendant le back-office : les fonctions
 * d'accès (lib/catalog.ts) sont le seul point à rebrancher sur une API / BDD.
 *
 * Produits d'EXEMPLE tirés des publications et des photos du client, qu'il
 * remplacera depuis l'admin. Règles :
 *  - TOUS LES PRIX SONT À CONFIRMER (TODO client), y compris ceux lus sur les affiches ;
 *  - aucune caractéristique technique inventée : seules celles publiées par le client ;
 *  - aucun nom de marque sans confirmation de l'authenticité du produit ;
 *  - photos du client dans public/photos (jamais les affiches de reference-client/,
 *    jamais d'image chargée depuis Facebook) ; sinon visuel provisoire du rayon.
 */

/** Lien d'un rayon (les rayons se gèrent dans l'admin : n'importe quel slug). */
export type CategorySlug = string;

export type Category = {
  slug: CategorySlug;
  label: string;
  title: string; // titre de la page boutique filtrée
  description: string;
  image: string;
  alt: string;
};

/** Visuel provisoire d'un rayon (à remplacer par une vraie photo de public/photos). */
const placeholder = (slug: CategorySlug) => `/photos/provisoire/${slug}.svg`;

/** Rayons, dans l'ordre d'affichage (menu de la boutique, grille de l'accueil). */
export const categories: Category[] = [
  {
    slug: "smartphones",
    label: "Smartphones",
    title: "Smartphones",
    description: "Samsung, Tecno et autres marques.",
    image: placeholder("smartphones"),
    alt: "Visuel provisoire : smartphone",
  },
  {
    slug: "ecouteurs-casques",
    label: "Écouteurs & casques",
    title: "Écouteurs et casques",
    description: "Écouteurs sans fil et casques Bluetooth.",
    image: "/photos/casque-anc-yesido-640.webp",
    alt: "Casque Bluetooth Yesido noir",
  },
  {
    slug: "montres",
    label: "Montres connectées",
    title: "Montres connectées",
    description: "Montres connectées pour tous les jours.",
    image: "/photos/montre-yesido-io22-600.webp",
    alt: "Montres connectées Yesido IO22",
  },
  {
    slug: "accessoires",
    label: "Chargeurs & câbles",
    title: "Chargeurs et câbles",
    description: "Chargeurs, chargeurs sans fil et câbles.",
    image: "/photos/station-charge-3en1-627.webp",
    alt: "Station de charge sans fil 3 en 1",
  },
  {
    slug: "protections",
    label: "Coques & protections",
    title: "Coques et protections",
    description: "Coques et protections d'écran.",
    image: placeholder("protections"),
    alt: "Visuel provisoire : protection",
  },
  {
    slug: "gadgets",
    label: "Gadgets",
    title: "Gadgets",
    description: "Loupes d'écran et petits accessoires malins.",
    image: placeholder("gadgets"),
    alt: "Visuel provisoire : loupe",
  },
];

export type ProductImage = { src: string; alt: string };


export type StorageOption = { label: string; price: number; oldPrice?: number };

export type Condition = "neuf" | "occasion" | "reconditionne";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: CategorySlug;
  condition: Condition;
  /** Prix de base (= première option de stockage s'il y en a). */
  price: number;
  /** Ancien prix barré : affiche le badge « Promo -X % ». */
  oldPrice?: number;
  images: ProductImage[];
  colors?: { name: string; hex: string }[];
  storage?: StorageOption[];
  /** ≤ 3 : « Stock limité » ; 0 : « Rupture » (ajout au panier désactivé). */
  stock: number;
  /** Occasion / reconditionné : état esthétique et santé de batterie (%). */
  grade?: "Comme neuf" | "Très bon état" | "Bon état";
  battery?: number;
  highlights: string[];
  specs: [label: string, value: string][];
  description: string;
  isNew: boolean;
  /** Pastille libre affichée en or (ex. « Promo » sans ancien prix connu). */
  tag?: string;
  /** Livraison offerte : une commande contenant ce produit ne paie pas la livraison. */
  freeDelivery?: boolean;
  /** Couleur de fond des photos (#rrggbb) : photo entière sur ce fond au lieu d'être recadrée. */
  imageBg?: string;
  isFeatured: boolean; // mis en avant sur l'accueil
  isActive: boolean; // false : masqué du site
};

/** Champs facultatifs à la saisie, complétés par withDefaults. */
type ProductInput = Omit<Product, "condition" | "isNew" | "isFeatured" | "isActive"> &
  Partial<Pick<Product, "condition" | "isNew" | "isFeatured" | "isActive">>;

const withDefaults = (p: ProductInput): Product => ({
  condition: "neuf",
  isNew: false,
  isFeatured: false,
  isActive: true,
  ...p,
});

const img = (slug: CategorySlug, alt: string): ProductImage => ({ src: placeholder(slug), alt: `${alt} (visuel provisoire)` });

// Visuels : photos fournies par le client (public/photos, optimisées par
// npm run photos:optimize) ; à défaut, visuel provisoire du rayon.
const photo = (file: string, alt: string): ProductImage => ({ src: `/photos/${file}`, alt });

// TODO client : confirmer chaque prix (FCFA), le stock et le modèle exact.
// Marques : n'écrire un nom de marque que si le client confirme l'authenticité
// du produit (Yesido : logo visible sur les photos fournies par le client).
const productInputs: ProductInput[] = [
  // --- Smartphones ---------------------------------------------------------------
  {
    id: "p-samsung",
    slug: "smartphone-samsung",
    name: "Smartphone Samsung Galaxy",
    brand: "Samsung",
    category: "smartphones",
    price: 100_000, // TODO client : modèle et prix
    images: [img("smartphones", "Smartphone Samsung")],
    stock: 5,
    highlights: ["Modèle et capacité à préciser"],
    specs: [],
    description: "Smartphone Samsung neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.",
    isFeatured: true,
  },
  {
    id: "p-tecno",
    slug: "smartphone-tecno",
    name: "Smartphone Tecno",
    brand: "Tecno",
    category: "smartphones",
    price: 80_000, // TODO client : modèle et prix
    images: [img("smartphones", "Smartphone Tecno")],
    stock: 5,
    highlights: ["Modèle et capacité à préciser"],
    specs: [],
    description: "Smartphone Tecno neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.",
  },

  // --- Écouteurs et casques --------------------------------------------------------
  {
    id: "p-casque-super-bass",
    slug: "casque-bluetooth-super-bass",
    name: "Casque Bluetooth Super Bass",
    brand: "",
    category: "ecouteurs-casques",
    price: 10_000, // prix de l'affiche « Super promo », TODO client : à confirmer
    images: [img("ecouteurs-casques", "Casque Bluetooth Super Bass")], // TODO client : photo du produit seul (l'affiche n'est pas publiable)
    stock: 10,
    tag: "Promo",
    freeDelivery: true,
    highlights: ["Bluetooth", "Super Bass", "Livraison offerte"],
    specs: [],
    description: "Casque Bluetooth aux basses renforcées, en promotion avec la livraison offerte.",
    isFeatured: true,
  },
  {
    id: "p-casque-anc-yesido",
    slug: "casque-bluetooth-anc-yesido",
    name: "Casque Bluetooth ANC Yesido",
    brand: "Yesido",
    category: "ecouteurs-casques",
    price: 25_000, // TODO client : prix
    images: [photo("casque-anc-yesido-640.webp", "Casque Bluetooth Yesido noir, arceau réglable et coussinets en similicuir")],
    imageBg: "#ffffff",
    stock: 5,
    highlights: ["Réduction de bruit active (ANC)", "Bluetooth"],
    specs: [],
    description: "Casque Bluetooth Yesido à réduction de bruit active.",
    isFeatured: true,
  },
  {
    id: "p-ecouteurs-conduction",
    slug: "ecouteurs-conduction-air-yesido",
    name: "Écouteurs à conduction d'air Yesido",
    brand: "Yesido",
    category: "ecouteurs-casques",
    price: 15_000, // TODO client : prix
    images: [photo("ecouteurs-conduction-yesido-640.webp", "Écouteurs Yesido à conduction d'air, tour de nuque noir")],
    stock: 5,
    highlights: ["Hors de l'oreille", "Bluetooth 5.3", "10 h d'autonomie"],
    specs: [
      ["Type", "Conduction d'air, hors de l'oreille"],
      ["Connexion", "Bluetooth 5.3"],
      ["Autonomie", "10 h"],
    ],
    description: "Le son sans rien dans l'oreille, dans un format léger.",
    isNew: true,
    isFeatured: true,
  },
  {
    id: "p-ecouteurs-sans-fil",
    slug: "ecouteurs-sans-fil",
    name: "Écouteurs sans fil",
    brand: "",
    category: "ecouteurs-casques",
    price: 15_000, // TODO client : à confirmer
    images: [img("ecouteurs-casques", "Écouteurs sans fil")],
    stock: 10,
    highlights: [],
    specs: [],
    description: "Écouteurs sans fil avec leur boîtier de charge. Demandez-nous les modèles et coloris disponibles.",
  },
  {
    id: "p-ep07",
    slug: "casque-anc-ep07",
    name: "Casque ANC EP07",
    brand: "",
    category: "ecouteurs-casques",
    price: 20_000, // TODO client : prix ; s'agit-il du même casque que le « Casque Bluetooth ANC Yesido » ?
    images: [img("ecouteurs-casques", "Casque ANC EP07")],
    stock: 10,
    highlights: ["Réduction de bruit 35 dB", "Bluetooth 5.3", "Jusqu'à 60 h d'autonomie"],
    specs: [
      ["Connexion", "Bluetooth 5.3"],
      ["Réduction de bruit", "Active (ANC), jusqu'à 35 dB"],
      ["Autonomie sans ANC", "50 à 60 h"],
      ["Autonomie avec ANC", "30 à 40 h"],
    ],
    description: "Casque à réduction de bruit active : coupez-vous du bruit et profitez de votre musique.",
  },

  // --- Montres connectées ------------------------------------------------------------
  {
    id: "p-montre-io22",
    slug: "montre-connectee-yesido-io22",
    name: "Montre connectée Yesido IO22",
    brand: "Yesido",
    category: "montres",
    price: 25_000, // prix de l'affiche, TODO client : à confirmer
    images: [photo("montre-yesido-io22-600.webp", "Deux montres connectées Yesido IO22 noires, écrans allumés")],
    imageBg: "#ffffff",
    stock: 8,
    highlights: ["Deux bracelets", "Jusqu'à 5 jours d'autonomie", "Résistante à l'eau IP67"],
    // Textes de la fiche fournie par le client (montre-yesido-io22-fiche.jpg)
    specs: [
      ["Écran", "Tactile HD, haute résolution, lisible même en plein soleil"],
      ["Santé", "Fréquence cardiaque, sommeil, pas et calories brûlées, entraînement multisports"],
      ["Notifications", "Appels, SMS et réseaux sociaux (WhatsApp, Facebook…)"],
      ["Connexion", "Bluetooth, compatible iOS et Android"],
      ["Autonomie", "Jusqu'à 5 jours d'utilisation, 30 jours en veille"],
      ["Bracelet", "Silicone ou métal, deux couleurs"],
      ["Étanchéité", "IP67"],
      ["Autres", "Contrôle de la musique, rappel de sédentarité, chronomètre et alarmes, localisation du téléphone"],
    ],
    description:
      "Une montre connectée légère et moderne : santé, sport et notifications au poignet, jusqu'à 5 jours sans recharge.",
    isNew: true,
    isFeatured: true,
  },

  // --- Chargeurs et câbles -----------------------------------------------------------
  {
    id: "p-station-3en1",
    slug: "station-charge-sans-fil-3-en-1",
    name: "Station de charge sans fil 3 en 1",
    brand: "",
    category: "accessoires",
    price: 15_000, // TODO client : prix
    images: [photo("station-charge-3en1-627.webp", "Station de charge 3 en 1 argentée avec support de montre et câble USB")],
    imageBg: "#ffffff",
    stock: 5,
    highlights: ["Charge sans fil", "Support de montre", "3 en 1"],
    specs: [],
    description: "Rechargez plusieurs appareils au même endroit, montre comprise, sur une seule station. Vérifiez avec nous la compatibilité avec vos appareils.",
    isFeatured: true,
  },
  {
    id: "p-batterie-porte-cles",
    slug: "mini-batterie-porte-cles",
    name: "Mini batterie porte-clés",
    brand: "",
    category: "accessoires",
    price: 7_500, // TODO client : prix
    images: [photo("batterie-porte-cles-640.webp", "Quatre mini batteries porte-clés : noir et rouge, noir et argent, blanc, rose")],
    imageBg: "#d9ebf5",
    colors: [
      { name: "Noir / rouge", hex: "#9b2c33" },
      { name: "Noir / argent", hex: "#2b2d31" },
      { name: "Blanc", hex: "#f2f2f0" },
      { name: "Rose", hex: "#f2c9cc" },
    ],
    stock: 12,
    highlights: ["USB-C + Lightning", "Format porte-clés", "4 coloris"],
    specs: [["Connecteurs", "USB-C et Lightning intégrés"]],
    description: "Une batterie d'appoint qui tient sur votre trousseau de clés, pour Android comme pour iPhone.",
  },

  // --- Gadgets ------------------------------------------------------------------------
  {
    id: "p-loupe",
    slug: "loupe-ecran",
    name: "Loupe d'écran",
    brand: "",
    category: "gadgets",
    price: 7_000, // TODO client : à confirmer
    images: [img("gadgets", "Loupe d'écran")],
    stock: 10,
    highlights: [],
    specs: [],
    description: "Loupe d'écran pour smartphone : l'image de votre téléphone en plus grand, pour vos vidéos.",
  },
];

export const products: Product[] = productInputs.map(withDefaults);
