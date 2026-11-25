/**
 * Catalogue. Données statiques en attendant le back-office : les fonctions
 * d'accès (lib/catalog.ts) sont le seul point à rebrancher sur une API / BDD.
 *
 * 9 produits d'EXEMPLE inspirés de la page Facebook du magasin, que le
 * commerçant remplacera depuis l'admin. Règles :
 *  - TOUS LES PRIX SONT À CONFIRMER (TODO client), y compris ceux repris des publications ;
 *  - aucune caractéristique technique inventée : seules celles publiées par le
 *    client figurent dans `specs` (casque ANC EP07) ;
 *  - visuels provisoires sobres (public/photos/provisoire), jamais d'image
 *    chargée depuis Facebook. Vraies photos : public/photos (voir son README).
 */

export type CategorySlug = "smartphones" | "ecouteurs-casques" | "montres" | "accessoires" | "protections" | "gadgets";

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
    image: placeholder("ecouteurs-casques"),
    alt: "Visuel provisoire : casque audio",
  },
  {
    slug: "montres",
    label: "Montres connectées",
    title: "Montres connectées",
    description: "Montres connectées pour tous les jours.",
    image: placeholder("montres"),
    alt: "Visuel provisoire : montre connectée",
  },
  {
    slug: "accessoires",
    label: "Chargeurs & câbles",
    title: "Chargeurs et câbles",
    description: "Chargeurs, chargeurs sans fil et câbles.",
    image: placeholder("accessoires"),
    alt: "Visuel provisoire : chargeur",
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

// TODO client : confirmer chaque prix (FCFA), le stock et le modèle exact.
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
    isFeatured: true,
  },

  // --- Écouteurs et casques --------------------------------------------------------
  {
    id: "p-jbl-casque",
    slug: "casque-bluetooth-jbl",
    name: "Casque Bluetooth JBL",
    brand: "JBL",
    category: "ecouteurs-casques",
    price: 10_000, // prix promo publié, TODO client : à confirmer
    images: [img("ecouteurs-casques", "Casque Bluetooth JBL")],
    stock: 10,
    tag: "Promo",
    freeDelivery: true,
    highlights: ["Bluetooth", "Livraison offerte"],
    specs: [],
    description: "Casque Bluetooth JBL en promotion, livraison offerte.",
    isFeatured: true,
  },
  {
    id: "p-jbl-tour-pro-2",
    slug: "ecouteurs-jbl-tour-pro-2",
    name: "Écouteurs JBL Tour Pro 2",
    brand: "JBL",
    category: "ecouteurs-casques",
    price: 15_000, // TODO client : à confirmer
    images: [img("ecouteurs-casques", "Écouteurs JBL Tour Pro 2")],
    stock: 10,
    highlights: [],
    specs: [],
    description: "Écouteurs JBL Tour Pro 2.",
    isFeatured: true,
  },
  {
    id: "p-ep07",
    slug: "casque-anc-ep07",
    name: "Casque ANC EP07",
    brand: "",
    category: "ecouteurs-casques",
    price: 20_000, // TODO client : prix
    images: [img("ecouteurs-casques", "Casque ANC EP07")],
    stock: 10,
    highlights: ["Réduction de bruit 35 dB", "Bluetooth 5.3", "Jusqu'à 60 h d'autonomie"],
    specs: [
      ["Connexion", "Bluetooth 5.3"],
      ["Réduction de bruit", "Active (ANC), jusqu'à 35 dB"],
      ["Autonomie sans ANC", "50 à 60 h"],
      ["Autonomie avec ANC", "30 à 40 h"],
    ],
    description: "Casque à réduction de bruit active : coupez-vous du bruit et profitez de votre musique.",
    isFeatured: true,
  },
  {
    id: "p-ecouteurs-sans-fil",
    slug: "ecouteurs-sans-fil",
    name: "Écouteurs sans fil",
    brand: "",
    category: "ecouteurs-casques",
    price: 8_000, // TODO client : modèle et prix
    images: [img("ecouteurs-casques", "Écouteurs sans fil")],
    stock: 10,
    highlights: [],
    specs: [],
    description: "Écouteurs sans fil. Demandez-nous les modèles et coloris disponibles.",
  },

  // --- Montres connectées ------------------------------------------------------------
  {
    id: "p-montre",
    slug: "montre-connectee",
    name: "Montre connectée",
    brand: "",
    category: "montres",
    price: 25_000, // TODO client : à confirmer
    images: [img("montres", "Montre connectée")],
    stock: 8,
    highlights: [],
    specs: [],
    description: "Montre connectée. Demandez-nous les modèles et coloris disponibles.",
    isFeatured: true,
  },

  // --- Chargeurs et câbles -----------------------------------------------------------
  {
    id: "p-chargeur-sans-fil",
    slug: "chargeur-sans-fil",
    name: "Chargeur sans fil",
    brand: "",
    category: "accessoires",
    price: 10_000, // TODO client : prix
    images: [img("accessoires", "Chargeur sans fil")],
    stock: 10,
    highlights: [],
    specs: [],
    description: "Chargeur sans fil. Vérifiez avec nous la compatibilité avec votre téléphone.",
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
