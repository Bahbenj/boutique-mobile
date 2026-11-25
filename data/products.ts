/**
 * Catalogue. Données statiques en attendant le back-office : les fonctions
 * d'accès (lib/catalog.ts) sont le seul point à rebrancher sur une API / BDD.
 *
 * 9 produits d'EXEMPLE (prix indicatifs en FCFA), que le commerçant remplacera
 * depuis l'admin. TODO client : prix, stocks et photos réels. Les images
 * Unsplash sont des placeholders et ne montrent pas toujours le bon modèle.
 */
import { unsplash } from "./home";

export type CategorySlug = "smartphones" | "occasion" | "ecouteurs" | "casques" | "protections" | "accessoires";

export type Category = {
  slug: CategorySlug;
  label: string;
  title: string; // titre de la page boutique filtrée
  description: string;
  image: string;
  alt: string;
};

/** Rayons, dans l'ordre d'affichage (menu de la boutique, grille de l'accueil). */
export const categories: Category[] = [
  {
    slug: "smartphones",
    label: "Smartphones",
    title: "Smartphones neufs",
    description: "Tecno, Samsung et Apple, scellés et garantis 12 mois.",
    image: unsplash("1610792516307-ea5acd9c3b00", 1200),
    alt: "Smartphone Samsung Galaxy noir posé sur sa boîte",
  },
  {
    slug: "occasion",
    label: "Occasion",
    title: "Smartphones d'occasion",
    description: "Testés sur 30 points, garantis 3 mois.",
    image: unsplash("1604671368394-2240d0b1bb6c", 1200),
    alt: "Trois iPhone de couleurs différentes, vue de dos",
  },
  {
    slug: "ecouteurs",
    label: "AirPods & écouteurs",
    title: "AirPods et écouteurs",
    description: "AirPods, écouteurs sans fil et filaires.",
    image: unsplash("1572569511254-d8f925fe2cbb", 1200),
    alt: "Écouteurs sans fil blancs et leur boîtier",
  },
  {
    slug: "casques",
    label: "Casques",
    title: "Casques audio",
    description: "Casques Bluetooth pour la musique et les appels.",
    image: unsplash("1505740420928-5e560c06d30e", 1200),
    alt: "Casque audio noir",
  },
  {
    slug: "protections",
    label: "Coques & protections",
    title: "Coques et protections",
    description: "Coques et verres trempés, pose offerte en magasin.",
    image: unsplash("1601593346740-925612772716", 1200),
    alt: "Main tenant un smartphone dans une coque effet carbone",
  },
  {
    slug: "accessoires",
    label: "Chargeurs & câbles",
    title: "Chargeurs et câbles",
    description: "Chargeurs rapides, câbles et adaptateurs.",
    image: unsplash("1583863788434-e58a36330cf0", 1200),
    alt: "Chargeur secteur blanc et son câble",
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
  // --- Smartphones neufs : Tecno et Samsung d'abord ---------------------------
  {
    id: "p-camon30",
    slug: "tecno-camon-30",
    name: "Camon 30",
    brand: "Tecno",
    category: "smartphones",
    price: 145_000,
    images: [img("1610945265064-0e34e5519bbf", "Smartphone argenté posé sur sa boîte (photo d'illustration)")],
    colors: [
      { name: "Uyuni White", hex: "#e9e7e2" },
      { name: "Basaltic Dark", hex: "#25272b" },
    ],
    storage: [
      { label: "256 Go · 8 Go RAM", price: 145_000 },
      { label: "512 Go · 12 Go RAM", price: 175_000 },
    ],
    stock: 10,
    highlights: ["Caméra 50 Mpx stabilisée", "Écran AMOLED 120 Hz", "Charge 70 W", "Double SIM"],
    specs: [
      ["Écran", "6,78″ AMOLED, 120 Hz"],
      ["Caméras", "50 + 2 Mpx, selfie 50 Mpx"],
      ["Batterie", "5 000 mAh, charge 70 W"],
      ["SIM", "Double SIM"],
      ["Garantie", "12 mois"],
    ],
    description:
      "Le photophone de Tecno : grand écran AMOLED, selfie 50 Mpx et charge ultra-rapide. Neuf, scellé, garanti 12 mois.",
    isFeatured: true,
    isNew: true,
  },
  {
    id: "p-spark20pro",
    slug: "tecno-spark-20-pro",
    name: "Spark 20 Pro",
    brand: "Tecno",
    category: "smartphones",
    price: 95_000,
    images: [img("1598327105666-5b89351aff97", "Smartphone Android, écran d'accueil allumé (photo d'illustration)")],
    colors: [
      { name: "Moonlit Black", hex: "#1f2024" },
      { name: "Frosty Ivory", hex: "#ecebe6" },
    ],
    storage: [{ label: "256 Go · 8 Go RAM", price: 95_000 }],
    stock: 15,
    highlights: ["Caméra 108 Mpx", "Écran 120 Hz", "Batterie 5 000 mAh", "Double SIM"],
    specs: [
      ["Écran", "6,78″ IPS, 120 Hz"],
      ["Caméras", "108 Mpx, selfie 32 Mpx"],
      ["Batterie", "5 000 mAh, charge 33 W"],
      ["SIM", "Double SIM"],
      ["Garantie", "12 mois"],
    ],
    description: "Le meilleur rapport qualité-prix : grand écran fluide, caméra 108 Mpx et grosse batterie.",
    isFeatured: true,
  },
  {
    id: "p-a55",
    slug: "samsung-galaxy-a55",
    name: "Galaxy A55 5G",
    brand: "Samsung",
    category: "smartphones",
    price: 230_000,
    oldPrice: 250_000,
    images: [img("1621330396173-e41b1cafd17f", "Deux smartphones Android vus de dos (photo d'illustration)")],
    colors: [
      { name: "Bleu nuit", hex: "#1e2a44" },
      { name: "Lilas", hex: "#c9b8e0" },
    ],
    storage: [
      { label: "128 Go", price: 230_000, oldPrice: 250_000 },
      { label: "256 Go", price: 260_000, oldPrice: 280_000 },
    ],
    stock: 8,
    highlights: ["5G", "Écran 120 Hz", "Résistant à l'eau IP67", "4 ans de mises à jour"],
    specs: [
      ["Écran", "6,6″ Super AMOLED, 120 Hz"],
      ["Processeur", "Exynos 1480"],
      ["Caméras", "50 + 12 + 5 Mpx"],
      ["Batterie", "5 000 mAh, charge 25 W"],
      ["Garantie", "12 mois"],
    ],
    description: "Le milieu de gamme le plus complet de Samsung : 5G, écran fluide, finition verre et métal.",
    isFeatured: true,
  },
  {
    id: "p-s24u",
    slug: "samsung-galaxy-s24-ultra",
    name: "Galaxy S24 Ultra",
    brand: "Samsung",
    category: "smartphones",
    price: 750_000,
    images: [img("1610792516307-ea5acd9c3b00", "Samsung Galaxy Ultra noir posé sur sa boîte")],
    colors: [
      { name: "Titanium Black", hex: "#2b2b2b" },
      { name: "Titanium Gray", hex: "#8a8a86" },
    ],
    storage: [
      { label: "256 Go", price: 750_000 },
      { label: "512 Go", price: 830_000 },
    ],
    stock: 3,
    highlights: ["S Pen intégré", "Zoom 100×", "Galaxy AI", "Châssis titane"],
    specs: [
      ["Écran", "6,8″ Dynamic AMOLED 2X, 120 Hz"],
      ["Processeur", "Snapdragon 8 Gen 3 for Galaxy"],
      ["Caméras", "200 + 50 + 12 + 10 Mpx"],
      ["Batterie", "5 000 mAh, charge 45 W"],
      ["Garantie", "12 mois"],
    ],
    description: "Le Galaxy le plus abouti : S Pen intégré, zoom 100× et écran anti-reflets. Neuf, scellé.",
    isFeatured: true,
  },

  // --- Occasion -------------------------------------------------------------------
  {
    id: "p-ip13-occ",
    slug: "iphone-13-occasion",
    name: "iPhone 13",
    brand: "Apple",
    category: "occasion",
    price: 230_000,
    oldPrice: 300_000,
    images: [img("1632661674596-df8be070a5c5", "iPhone bleu tenu en main, vue de dos")],
    colors: [{ name: "Minuit", hex: "#1f2328" }],
    storage: [
      { label: "128 Go", price: 230_000, oldPrice: 300_000 },
      { label: "256 Go", price: 265_000, oldPrice: 340_000 },
    ],
    stock: 2,
    condition: "occasion",
    grade: "Très bon état",
    battery: 87,
    highlights: ["Testé sur 30 points", "Batterie 87 %", "Débloqué tout opérateur"],
    specs: [
      ["Écran", "6,1″ Super Retina XDR"],
      ["Puce", "A15 Bionic"],
      ["Caméras", "12 + 12 Mpx"],
      ["État", "Très bon état : micro-rayures invisibles à 20 cm"],
      ["Garantie", "3 mois"],
    ],
    description: "Contrôlé, nettoyé et réinitialisé en magasin. Livré avec un câble de charge et un verre trempé posé.",
    isFeatured: true,
  },

  // --- AirPods et écouteurs ---------------------------------------------------------
  {
    id: "p-airpodspro2",
    slug: "airpods-pro-2",
    name: "AirPods Pro (2e gén.)",
    brand: "Apple",
    category: "ecouteurs",
    price: 150_000,
    oldPrice: 165_000,
    images: [
      img("1572569511254-d8f925fe2cbb", "AirPods Pro blancs devant leur boîtier ouvert"),
      img("1600294037681-c80b4cb5b434", "AirPods posés à côté de leur boîtier"),
    ],
    stock: 6,
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

  // --- Casques -------------------------------------------------------------------------
  {
    id: "p-headphones",
    slug: "casque-bluetooth-oraimo",
    name: "Casque Bluetooth BoomPop",
    brand: "Oraimo",
    category: "casques",
    price: 15_000,
    images: [img("1505740420928-5e560c06d30e", "Casque audio noir (photo d'illustration)")],
    colors: [{ name: "Noir", hex: "#1c1c1c" }],
    stock: 12,
    highlights: ["40 h d'autonomie", "Basses renforcées", "Appels mains libres"],
    specs: [
      ["Autonomie", "40 h"],
      ["Connexion", "Bluetooth 5.3, prise jack"],
      ["Garantie", "6 mois"],
    ],
    description: "Un casque léger et endurant pour la musique et les appels, compatible avec tous les téléphones.",
  },

  // --- Coques et protections ------------------------------------------------------------
  {
    id: "p-protection",
    slug: "coque-antichoc-verre-trempe",
    name: "Coque antichoc + verre trempé",
    brand: "Mobile Empire",
    category: "protections",
    price: 5_000,
    images: [img("1601593346740-925612772716", "Main tenant un smartphone dans une coque effet carbone")],
    colors: [
      { name: "Transparent", hex: "#dfe3e8" },
      { name: "Noir", hex: "#1c1c1c" },
    ],
    stock: 40,
    highlights: ["Pose du verre offerte en magasin", "Coins renforcés", "Tecno, Samsung, iPhone"],
    specs: [
      ["Contenu", "1 coque + 1 verre trempé 9H"],
      ["Modèles", "Préciser le modèle à la commande"],
    ],
    description: "La protection complète à petit prix. Venez la faire poser gratuitement en magasin.",
  },

  // --- Chargeurs et câbles ---------------------------------------------------------------
  {
    id: "p-charger25",
    slug: "chargeur-samsung-25w",
    name: "Chargeur rapide 25 W + câble USB-C",
    brand: "Samsung",
    category: "accessoires",
    price: 12_000,
    images: [img("1583863788434-e58a36330cf0", "Chargeur secteur blanc et son câble")],
    stock: 30,
    highlights: ["Charge super rapide 25 W", "Câble USB-C fourni", "Compatible Tecno et iPhone 15"],
    specs: [
      ["Puissance", "25 W (PD 3.0)"],
      ["Connecteur", "USB-C"],
      ["Garantie", "6 mois"],
    ],
    description: "Le chargeur officiel Samsung avec son câble : recharge rapide et sûre.",
  },
];

export const products: Product[] = productInputs.map(withDefaults);
