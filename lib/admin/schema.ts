import { z } from "zod";

/**
 * Schémas de validation du catalogue (admin). Partagés navigateur / serveur :
 * le formulaire affiche les erreurs, le serveur revalide TOUJOURS avant d'écrire.
 */

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** « iPhone 15 Pro (Occasion) » → « iphone-15-pro-occasion » */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Montant en FCFA (entier, sans décimales) : « 750 000 », « 750.000 »,
 * « 750000 FCFA » → 750000 ; vide → null ; invalide → NaN.
 * Espaces et points ne sont acceptés que comme séparateurs de milliers
 * (groupes de 3 chiffres) : « 10.5 » ou « 75 00 » sont refusés, jamais lus 105 ou 7500.
 */
export function parseAmount(raw: string): number | null {
  const s = raw
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\s*F\s?CFA\s*$/i, "")
    .trim();
  if (!s) return null;
  if (/^\d{1,10}$/.test(s)) return Number(s);
  if (/^\d{1,3}([ .]\d{3})+$/.test(s)) return Number(s.replace(/[ .]/g, ""));
  return NaN;
}

const amount = (label: string) =>
  z
    .number({ error: `${label} : montant invalide (nombre entier en FCFA).` })
    .int(`${label} : le franc CFA n'a pas de décimales.`)
    .min(0, `${label} : montant invalide.`)
    .max(100_000_000, `${label} : montant trop élevé.`);

const text = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`);

export const conditions = ["neuf", "occasion", "reconditionne"] as const;
export const conditionLabels: Record<(typeof conditions)[number], string> = {
  neuf: "Neuf",
  occasion: "Occasion",
  reconditionne: "Reconditionné",
};
export const grades = ["Comme neuf", "Très bon état", "Bon état"] as const;

/** Filtres de statut de la liste (« actifs » / « inactifs » : anciens liens, toujours acceptés). */
export const productStatusFilters = {
  "en-vente": "En vente",
  masques: "Masqués",
  faible: "Stock faible",
  rupture: "Rupture",
  promo: "En promo",
  "sans-prix": "Prix à renseigner",
  vedettes: "Mis en avant",
} as const;
export type ProductStatusFilter = keyof typeof productStatusFilters | "actifs" | "inactifs";

export const MAX_IMAGES = 10;

/** URL https (Supabase Storage, Unsplash) ou fichier du site (/photos/…, /brand/…). */
const imageUrl = z.string().trim().refine((v) => /^https:\/\/\S+$/.test(v) || /^\/(photos|brand)\/[\w\-/]+\.(webp|avif|jpe?g|png|svg)$/.test(v), "Photo invalide.");

export const colorSchema = z.object({
  name: z.string().trim().min(1, "Nom de couleur requis.").max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
});

export const storageSchema = z
  .object({
    label: z.string().trim().min(1, "Capacité requise.").max(30),
    price: amount("Prix de la capacité"),
    old_price: amount("Ancien prix").nullable().optional(),
  })
  .refine((s) => s.old_price == null || s.old_price > s.price, {
    message: "L'ancien prix doit être supérieur au prix.",
    path: ["old_price"],
  });

export const productSchema = z
  .object({
    name: z.string().trim().min(1, "Nom requis.").max(120, "120 caractères maximum."),
    slug: z.string().trim().regex(SLUG_RE, "Lettres minuscules, chiffres et tirets uniquement.").max(120),
    brand: text(60),
    category_id: z.uuid({ error: "Choisissez une catégorie." }),
    condition: z.enum(conditions),
    grade: text(40).nullable(),
    battery: z.number().int().min(0, "Entre 0 et 100.").max(100, "Entre 0 et 100.").nullable(),
    price: amount("Prix"),
    old_price: amount("Ancien prix").nullable(),
    /** Prix pendant la promotion (inférieur au prix), dates facultatives. */
    promo_price: amount("Prix promo").nullable(),
    promo_starts_at: z.iso.datetime({ offset: true, error: "Date de début invalide." }).nullable(),
    promo_ends_at: z.iso.datetime({ offset: true, error: "Date de fin invalide." }).nullable(),
    stock: z.number({ error: "Stock invalide." }).int("Stock invalide.").min(0, "Stock invalide.").max(100_000),
    is_new: z.boolean(),
    is_featured: z.boolean(),
    is_active: z.boolean(),
    /** Pastille libre en or (ex. « Promo »), vide = aucune. */
    tag: z
      .string()
      .trim()
      .max(24, "24 caractères maximum.")
      .transform((v) => v || null),
    /** Livraison offerte pour toute commande contenant ce produit. */
    free_delivery: z.boolean(),
    /** Photo entière sur ce fond (#rrggbb) au lieu d'être recadrée ; null = recadrée. */
    image_bg: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.")
      .nullable(),
    description: text(5000),
    highlights: z.array(z.string().trim().min(1).max(80)).max(12, "12 points forts maximum."),
    specs: z.array(z.tuple([z.string().trim().min(1).max(60), z.string().trim().min(1).max(200)])).max(30),
    images: z.array(imageUrl).min(1, "Ajoutez au moins une photo.").max(MAX_IMAGES, `${MAX_IMAGES} photos maximum.`),
    variants: z.object({
      colors: z.array(colorSchema).max(12).optional(),
      storage: z.array(storageSchema).max(8).optional(),
    }),
  })
  .refine((p) => p.old_price == null || p.old_price > p.price, {
    message: "L'ancien prix doit être supérieur au prix.",
    path: ["old_price"],
  })
  .refine((p) => (p.variants.storage?.length ?? 0) > 0 || p.price > 0, { message: "Indiquez le prix.", path: ["price"] })
  .refine((p) => p.promo_price == null || p.promo_price < p.price, {
    message: "Le prix promo doit être inférieur au prix normal.",
    path: ["promo_price"],
  })
  .refine((p) => !p.promo_starts_at || !p.promo_ends_at || new Date(p.promo_ends_at) > new Date(p.promo_starts_at), {
    message: "La fin de la promo doit être après le début.",
    path: ["promo_ends_at"],
  })
  // Avec des capacités, le prix affiché « dès » est celui de la première
  .transform((p) => {
    const first = p.variants.storage?.[0];
    // Promo réservée au prix unique : avec des capacités, chaque capacité a son ancien prix
    return first ? { ...p, price: first.price, old_price: first.old_price ?? null, promo_price: null, promo_starts_at: null, promo_ends_at: null } : p;
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const quickUpdateSchema = z.object({
  id: z.uuid(),
  price: amount("Prix").optional(),
  stock: z.number().int().min(0, "Le stock ne peut pas être négatif.").max(100_000, "Stock trop élevé.").optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

/** Actions groupées de la liste des produits. */
export const bulkSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("hide"), ids: z.array(z.uuid()).min(1).max(200) }),
  z.object({ action: z.literal("show"), ids: z.array(z.uuid()).min(1).max(200) }),
  z.object({ action: z.literal("category"), ids: z.array(z.uuid()).min(1).max(200), category_id: z.uuid({ error: "Choisissez une catégorie." }) }),
  z.object({
    action: z.literal("discount"),
    ids: z.array(z.uuid()).min(1).max(200),
    percent: z.number({ error: "Remise invalide." }).int("Remise en pourcentage entier.").min(1, "Entre 1 et 90 %.").max(90, "Entre 1 et 90 %."),
    promo_starts_at: z.iso.datetime({ offset: true }).nullable(),
    promo_ends_at: z.iso.datetime({ offset: true }).nullable(),
  }),
  z.object({ action: z.literal("end-promo"), ids: z.array(z.uuid()).min(1).max(200) }),
]);
export type BulkInput = z.input<typeof bulkSchema>;

export const categorySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Nom requis.").max(80, "80 caractères maximum."),
  slug: z.string().trim().regex(SLUG_RE, "Lettres minuscules, chiffres et tirets uniquement.").max(80),
  description: text(300),
  image: imageUrl.nullable(),
});

export type CategoryInput = z.input<typeof categorySchema>;

/** Erreurs zod → { "champ.sous.champ": "message" } pour le formulaire. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/** Ligne produit telle que lue en base. */
export type DbProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  brand: string;
  price: number;
  old_price: number | null;
  stock: number;
  condition: (typeof conditions)[number];
  grade: string | null;
  battery: number | null;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  promo_price: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  tag: string | null;
  free_delivery: boolean;
  image_bg: string | null;
  images: string[];
  variants: { colors?: { name: string; hex: string }[]; storage?: { label: string; price: number; old_price?: number | null }[] };
  highlights: string[];
  specs: [string, string][];
  created_at: string;
  updated_at: string;
};

export type DbCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  position: number;
  is_active: boolean;
};

/** Résultat standard d'une Server Action admin. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fields?: Record<string, string> };
