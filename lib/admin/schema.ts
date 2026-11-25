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
    category_id: z.uuid().nullable(),
    condition: z.enum(conditions),
    grade: text(40).nullable(),
    battery: z.number().int().min(0, "Entre 0 et 100.").max(100, "Entre 0 et 100.").nullable(),
    price: amount("Prix"),
    old_price: amount("Ancien prix").nullable(),
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
    images: z.array(imageUrl).max(MAX_IMAGES, `${MAX_IMAGES} photos maximum.`),
    variants: z.object({
      colors: z.array(colorSchema).max(12).optional(),
      storage: z.array(storageSchema).max(8).optional(),
    }),
  })
  .refine((p) => p.old_price == null || p.old_price > p.price, {
    message: "L'ancien prix doit être supérieur au prix.",
    path: ["old_price"],
  })
  // Avec des capacités, le prix affiché « dès » est celui de la première
  .transform((p) => {
    const first = p.variants.storage?.[0];
    return first ? { ...p, price: first.price, old_price: first.old_price ?? null } : p;
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const quickUpdateSchema = z.object({
  id: z.uuid(),
  price: amount("Prix").optional(),
  stock: z.number().int().min(0).max(100_000).optional(),
});

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
};

/** Résultat standard d'une Server Action admin. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fields?: Record<string, string> };
