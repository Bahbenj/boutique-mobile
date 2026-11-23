/**
 * Contenu éditorial de la page d'accueil. Les images Unsplash sont des
 * placeholders : remplacer par les photos du magasin (dans /public/images).
 */

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
