/**
 * Catalogue. Données statiques en attendant le back-office : les fonctions
 * d'accès (lib/catalog.ts) sont le seul point à rebrancher sur une API / BDD.
 *
 * TODO client : prix, stocks et photos réelles. Les images Unsplash sont des
 * placeholders et ne correspondent pas toujours exactement au modèle.
 */
import { unsplash } from "./home";

export type CategorySlug = "neufs" | "occasion" | "accessoires";

export type Category = {
  slug: CategorySlug;
  label: string;
  title: string; // titre de la page boutique filtrée
  description: string;
  image: string;
  alt: string;
};

export const categories: Category[] = [
  {
    slug: "neufs",
    label: "Neufs",
    title: "Téléphones neufs",
    description: "Scellés, facturés, garantis 12 mois.",
    image: unsplash("1678685888221-cda773a3dcdb", 1200),
    alt: "iPhone Pro titane tenu en main",
  },
  {
    slug: "occasion",
    label: "Occasion",
    title: "Téléphones d'occasion",
    description: "Testés sur 30 points, garantis 3 mois.",
    image: unsplash("1591337676887-a217a6970a8a", 1200),
    alt: "iPhone blanc posé sur un fond jaune",
  },
  {
    slug: "accessoires",
    label: "Accessoires",
    title: "Accessoires",
    description: "Écouteurs, chargeurs, coques et protections.",
    image: unsplash("1572569511254-d8f925fe2cbb", 1200),
    alt: "Écouteurs sans fil blancs et leur boîtier",
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
  isFeatured: boolean; // mis en avant sur l'accueil
  isActive: boolean; // false : masqué du site
};

/** Champs facultatifs à la saisie, complétés par withDefaults. */
type ProductInput = Omit<Product, "condition" | "isNew" | "isFeatured" | "isActive"> &
  Partial<Pick<Product, "condition" | "isNew" | "isFeatured" | "isActive">>;

const withDefaults = (p: ProductInput): Product => ({
  condition: p.category === "occasion" ? "occasion" : "neuf",
  isNew: false,
  isFeatured: false,
  isActive: true,
  ...p,
});

const img = (id: string, alt: string): ProductImage => ({ src: unsplash(id, 1200), alt });

const productInputs: ProductInput[] = [
  // --- Neufs -----------------------------------------------------------------
  {
    id: "p-ip15pro",
    slug: "iphone-15-pro",
    name: "iPhone 15 Pro",
    brand: "Apple",
    category: "neufs",
    price: 4799,
    images: [
      img("1678685888221-cda773a3dcdb", "iPhone Pro titane naturel, vue de dos"),
      img("1617997455403-41f333d44d5b", "iPhone Pro bleu posé debout"),
    ],
    colors: [
      { name: "Titane naturel", hex: "#8f8a81" },
      { name: "Titane noir", hex: "#3b3b3d" },
      { name: "Titane bleu", hex: "#3f4a5a" },
    ],
    storage: [
      { label: "128 Go", price: 4799 },
      { label: "256 Go", price: 5299 },
      { label: "512 Go", price: 6199 },
    ],
    stock: 6,
    highlights: ["Puce A17 Pro", "Châssis en titane", "Triple caméra 48 Mpx", "USB-C"],
    specs: [
      ["Écran", "6,1″ Super Retina XDR, 120 Hz"],
      ["Puce", "A17 Pro"],
      ["Caméras", "48 + 12 + 12 Mpx, zoom optique 3×"],
      ["Batterie", "Jusqu'à 23 h de vidéo"],
      ["Connecteur", "USB-C (USB 3)"],
      ["Garantie", "12 mois"],
    ],
    description:
      "Le plus léger des iPhone Pro, avec un châssis en titane et la puce A17 Pro. Neuf, scellé, livré avec facture.",
    isFeatured: true,
    isNew: true,
  },
  {
    id: "p-s24u",
    slug: "samsung-galaxy-s24-ultra",
    name: "Galaxy S24 Ultra",
    brand: "Samsung",
    category: "neufs",
    price: 4399,
    oldPrice: 4699,
    images: [img("1610792516307-ea5acd9c3b00", "Samsung Galaxy Ultra noir posé sur sa boîte")],
    colors: [
      { name: "Titanium Black", hex: "#2b2b2b" },
      { name: "Titanium Gray", hex: "#8a8a86" },
    ],
    storage: [
      { label: "256 Go", price: 4399, oldPrice: 4699 },
      { label: "512 Go", price: 4899, oldPrice: 5199 },
    ],
    stock: 4,
    highlights: ["S Pen intégré", "Zoom 100×", "Écran 6,8″ 120 Hz", "Galaxy AI"],
    specs: [
      ["Écran", "6,8″ Dynamic AMOLED 2X, 120 Hz"],
      ["Processeur", "Snapdragon 8 Gen 3 for Galaxy"],
      ["Caméras", "200 + 50 + 12 + 10 Mpx"],
      ["Batterie", "5 000 mAh, charge 45 W"],
      ["Garantie", "12 mois"],
    ],
    description:
      "Le Galaxy le plus complet : S Pen intégré, zoom 100× et écran anti-reflets. Neuf, scellé, version internationale.",
    isFeatured: true,
  },
  {
    id: "p-ip13",
    slug: "iphone-13",
    name: "iPhone 13",
    brand: "Apple",
    category: "neufs",
    price: 2499,
    images: [img("1632661674596-df8be070a5c5", "iPhone bleu tenu en main, vue de dos")],
    colors: [
      { name: "Minuit", hex: "#1f2328" },
      { name: "Lumière stellaire", hex: "#ece6dc" },
      { name: "Bleu", hex: "#2f4f6b" },
    ],
    storage: [
      { label: "128 Go", price: 2499 },
      { label: "256 Go", price: 2899 },
    ],
    stock: 9,
    highlights: ["Puce A15 Bionic", "Double caméra 12 Mpx", "Mode Cinématique"],
    specs: [
      ["Écran", "6,1″ Super Retina XDR"],
      ["Puce", "A15 Bionic"],
      ["Caméras", "12 + 12 Mpx"],
      ["Batterie", "Jusqu'à 19 h de vidéo"],
      ["Garantie", "12 mois"],
    ],
    description: "Un iPhone fiable et rapide au meilleur prix. Neuf, scellé, garanti 12 mois.",
    isFeatured: true,
  },
  {
    id: "p-a55",
    slug: "samsung-galaxy-a55",
    name: "Galaxy A55 5G",
    brand: "Samsung",
    category: "neufs",
    price: 1349,
    images: [img("1598327105666-5b89351aff97", "Smartphone Samsung Android, écran d'accueil allumé")],
    colors: [
      { name: "Bleu nuit", hex: "#1e2a44" },
      { name: "Lilas", hex: "#c9b8e0" },
    ],
    storage: [
      { label: "128 Go", price: 1349 },
      { label: "256 Go", price: 1549 },
    ],
    stock: 12,
    highlights: ["5G", "Écran 120 Hz", "Batterie 5 000 mAh", "Résistant à l'eau IP67"],
    specs: [
      ["Écran", "6,6″ Super AMOLED, 120 Hz"],
      ["Processeur", "Exynos 1480"],
      ["Caméras", "50 + 12 + 5 Mpx"],
      ["Batterie", "5 000 mAh, charge 25 W"],
      ["Garantie", "12 mois"],
    ],
    description: "Le milieu de gamme le plus complet de Samsung : 5G, écran fluide et grosse batterie.",
    isFeatured: true,
  },
  {
    id: "p-rn13",
    slug: "xiaomi-redmi-note-13-pro",
    name: "Redmi Note 13 Pro",
    brand: "Xiaomi",
    category: "neufs",
    price: 1099,
    oldPrice: 1199,
    images: [img("1621330396173-e41b1cafd17f", "Deux smartphones Xiaomi, jaune et bleu, vue de dos")],
    colors: [
      { name: "Noir", hex: "#1c1c1c" },
      { name: "Bleu glacier", hex: "#a9c7d8" },
    ],
    storage: [
      { label: "256 Go", price: 1099, oldPrice: 1199 },
      { label: "512 Go", price: 1299, oldPrice: 1399 },
    ],
    stock: 15,
    highlights: ["Caméra 200 Mpx", "Écran AMOLED 120 Hz", "Charge 67 W"],
    specs: [
      ["Écran", "6,67″ AMOLED, 120 Hz"],
      ["Processeur", "Snapdragon 7s Gen 2"],
      ["Caméras", "200 + 8 + 2 Mpx"],
      ["Batterie", "5 100 mAh, charge 67 W"],
      ["Garantie", "12 mois"],
    ],
    description: "Une caméra 200 Mpx et la charge rapide 67 W à prix doux. Neuf, scellé, garanti 12 mois.",
    isFeatured: true,
  },

  // --- Occasion --------------------------------------------------------------
  {
    id: "p-ip12pro-occ",
    slug: "iphone-12-pro-occasion",
    name: "iPhone 12 Pro",
    brand: "Apple",
    category: "occasion",
    price: 1699,
    oldPrice: 2199,
    images: [img("1604671368394-2240d0b1bb6c", "Trois iPhone Pro de couleurs différentes, vue de dos")],
    colors: [{ name: "Bleu Pacifique", hex: "#2f4f63" }],
    storage: [
      { label: "128 Go", price: 1699, oldPrice: 2199 },
      { label: "256 Go", price: 1899, oldPrice: 2399 },
    ],
    stock: 3,
    condition: "occasion",
    grade: "Très bon état",
    battery: 88,
    highlights: ["Testé sur 30 points", "Batterie 88 %", "Débloqué tout opérateur"],
    specs: [
      ["Écran", "6,1″ Super Retina XDR"],
      ["Puce", "A14 Bionic"],
      ["Caméras", "12 + 12 + 12 Mpx, LiDAR"],
      ["État", "Très bon état : micro-rayures invisibles à 20 cm"],
      ["Garantie", "3 mois"],
    ],
    description:
      "Contrôlé, nettoyé et réinitialisé en magasin. Livré avec un câble de charge et un verre trempé posé.",
    isFeatured: true,
  },
  {
    id: "p-ip11-occ",
    slug: "iphone-11-occasion",
    name: "iPhone 11",
    brand: "Apple",
    category: "occasion",
    price: 1049,
    oldPrice: 1399,
    images: [img("1591337676887-a217a6970a8a", "iPhone 11 blanc posé sur un fond jaune")],
    colors: [{ name: "Blanc", hex: "#f1f0ec" }],
    storage: [
      { label: "64 Go", price: 1049, oldPrice: 1399 },
      { label: "128 Go", price: 1199, oldPrice: 1549 },
    ],
    stock: 5,
    condition: "occasion",
    grade: "Comme neuf",
    battery: 91,
    highlights: ["Testé sur 30 points", "Batterie 91 %", "Aucune rayure"],
    specs: [
      ["Écran", "6,1″ Liquid Retina"],
      ["Puce", "A13 Bionic"],
      ["Caméras", "12 + 12 Mpx"],
      ["État", "Comme neuf : aucune trace d'usage"],
      ["Garantie", "3 mois"],
    ],
    description: "Le premier iPhone idéal pour un budget serré. Contrôlé en magasin, garanti 3 mois.",
    isFeatured: true,
  },
  {
    id: "p-ipx-occ",
    slug: "iphone-xs-occasion",
    name: "iPhone XS",
    brand: "Apple",
    category: "occasion",
    price: 749,
    images: [img("1567581935884-3349723552ca", "iPhone sur fond rouge, écran de verrouillage allumé")],
    colors: [{ name: "Gris sidéral", hex: "#3a3a3c" }],
    storage: [{ label: "64 Go", price: 749 }],
    stock: 0, // exemple de produit en rupture
    condition: "occasion",
    grade: "Bon état",
    battery: 84,
    highlights: ["Testé sur 30 points", "Batterie 84 %", "Écran OLED"],
    specs: [
      ["Écran", "5,8″ Super Retina OLED"],
      ["Puce", "A12 Bionic"],
      ["État", "Bon état : rayures légères sur le châssis"],
      ["Garantie", "3 mois"],
    ],
    description: "Un iPhone compact à petit prix, idéal en premier smartphone ou en téléphone de secours.",
  },
  {
    id: "p-s21u-occ",
    slug: "samsung-galaxy-s21-ultra-occasion",
    name: "Galaxy S21 Ultra",
    brand: "Samsung",
    category: "occasion",
    price: 1399,
    oldPrice: 1899,
    images: [img("1610792516307-ea5acd9c3b00", "Samsung Galaxy Ultra noir posé sur sa boîte")],
    colors: [{ name: "Phantom Black", hex: "#1d1d1f" }],
    storage: [{ label: "256 Go", price: 1399, oldPrice: 1899 }],
    stock: 1,
    condition: "occasion",
    grade: "Très bon état",
    battery: 86,
    highlights: ["Testé sur 30 points", "Zoom 100×", "Écran 120 Hz"],
    specs: [
      ["Écran", "6,8″ Dynamic AMOLED 2X, 120 Hz"],
      ["Caméras", "108 + 12 + 10 + 10 Mpx"],
      ["État", "Très bon état"],
      ["Garantie", "3 mois"],
    ],
    description: "L'ancien haut de gamme de Samsung, toujours redoutable en photo. Contrôlé et garanti 3 mois.",
  },

  // --- Accessoires -------------------------------------------------------------
  {
    id: "p-airpodspro2",
    slug: "airpods-pro-2",
    name: "AirPods Pro (2e gén.)",
    brand: "Apple",
    category: "accessoires",
    price: 899,
    oldPrice: 999,
    images: [
      img("1572569511254-d8f925fe2cbb", "AirPods Pro blancs devant leur boîtier ouvert"),
      img("1600294037681-c80b4cb5b434", "AirPods posés à côté de leur boîtier"),
    ],
    stock: 8,
    highlights: ["Réduction de bruit active", "Boîtier USB-C", "Audio spatial"],
    specs: [
      ["Autonomie", "6 h (30 h avec le boîtier)"],
      ["Charge", "USB-C, MagSafe, Qi"],
      ["Résistance", "IP54"],
      ["Garantie", "12 mois"],
    ],
    description: "Réduction de bruit deux fois plus efficace et mode Transparence adaptatif. Neufs, scellés.",
    isFeatured: true,
  },
  {
    id: "p-buds",
    slug: "ecouteurs-sans-fil-anc",
    name: "Écouteurs sans fil ANC",
    brand: "Soundcore",
    category: "accessoires",
    price: 189,
    images: [img("1590658268037-6bf12165a8df", "Trois paires d'écouteurs sans fil et leurs boîtiers")],
    colors: [
      { name: "Noir", hex: "#1c1c1c" },
      { name: "Blanc", hex: "#f2f2f2" },
    ],
    stock: 20,
    highlights: ["Réduction de bruit", "40 h d'autonomie", "Bluetooth 5.3"],
    specs: [
      ["Autonomie", "10 h (40 h avec le boîtier)"],
      ["Connexion", "Bluetooth 5.3"],
      ["Garantie", "6 mois"],
    ],
    description: "La réduction de bruit sans se ruiner, compatible iPhone et Android.",
  },
  {
    id: "p-charger20",
    slug: "chargeur-rapide-usb-c-20w",
    name: "Chargeur rapide USB-C 20 W",
    brand: "Apple",
    category: "accessoires",
    price: 79,
    images: [img("1583863788434-e58a36330cf0", "Chargeur secteur blanc et son câble")],
    stock: 40,
    highlights: ["Charge rapide 50 % en 30 min", "Compatible iPhone 8 et +"],
    specs: [
      ["Puissance", "20 W"],
      ["Connecteur", "USB-C"],
      ["Garantie", "6 mois"],
    ],
    description: "Le chargeur officiel pour recharger un iPhone à 50 % en 30 minutes environ.",
  },
  {
    id: "p-case",
    slug: "coque-fibre-aramide",
    name: "Coque fibre aramide",
    brand: "Boutique",
    category: "accessoires",
    price: 59,
    images: [img("1601593346740-925612772716", "Main tenant un iPhone dans une coque effet carbone")],
    colors: [{ name: "Noir carbone", hex: "#222" }],
    stock: 25,
    highlights: ["0,6 mm d'épaisseur", "Compatible MagSafe", "Pose offerte en magasin"],
    specs: [
      ["Matière", "Fibre aramide"],
      ["Modèles", "iPhone 12 à 15 (préciser à la commande)"],
    ],
    description: "Ultra fine et résistante, pour protéger sans alourdir.",
  },
  {
    id: "p-headphones",
    slug: "casque-bluetooth",
    name: "Casque Bluetooth",
    brand: "Sony",
    category: "accessoires",
    price: 349,
    oldPrice: 399,
    images: [img("1505740420928-5e560c06d30e", "Casque audio noir sur fond jaune")],
    stock: 6,
    highlights: ["50 h d'autonomie", "Charge rapide", "Appels mains libres"],
    specs: [
      ["Autonomie", "50 h"],
      ["Connexion", "Bluetooth 5.2"],
      ["Garantie", "12 mois"],
    ],
    description: "Un casque léger et endurant pour la musique et les appels.",
  },
];

export const products: Product[] = productInputs.map(withDefaults);
