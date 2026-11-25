import { z } from "zod";

/** Validation des promotions et codes promo (navigateur et Server Actions). */

const optionalDate = z.iso.datetime({ offset: true }).nullable();
const amount = (msg: string) => z.number({ error: msg }).int(msg).positive(msg).max(100_000_000, msg);

const discountFields = {
  kind: z.enum(["percent", "amount"]),
  value: amount("Indiquez la remise."),
};

const percentMax = (d: { kind: string; value: number }) => d.kind !== "percent" || d.value <= 90;

export const promotionSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, "Donnez un nom à la promotion (ex. « Soldes de fin d'année »).").max(80, "80 caractères maximum."),
    ...discountFields,
    scope: z.enum(["all", "category", "product"]),
    category_id: z.uuid().nullable(),
    product_id: z.uuid().nullable(),
    starts_at: optionalDate,
    ends_at: optionalDate,
    is_active: z.boolean(),
  })
  .refine(percentMax, { path: ["value"], message: "90 % au maximum." })
  .refine((d) => d.scope !== "category" || d.category_id, { path: ["category_id"], message: "Choisissez la catégorie." })
  .refine((d) => d.scope !== "product" || d.product_id, { path: ["product_id"], message: "Choisissez le produit." })
  .refine((d) => !d.starts_at || !d.ends_at || Date.parse(d.ends_at) > Date.parse(d.starts_at), { path: ["ends_at"], message: "La fin doit être après le début." })
  .transform((d) => ({
    ...d,
    category_id: d.scope === "category" ? d.category_id : null,
    product_id: d.scope === "product" ? d.product_id : null,
  }));

export type PromotionInput = z.input<typeof promotionSchema>;

export const promoCodeSchema = z
  .object({
    id: z.uuid().optional(),
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "3 à 30 lettres ou chiffres, sans espace (ex. BIENVENUE10).")),
    ...discountFields,
    min_order: z.number().int().min(0).max(100_000_000),
    max_uses: z.number().int().positive("Au moins 1.").max(1_000_000).nullable(),
    expires_at: optionalDate,
    is_active: z.boolean(),
  })
  .refine(percentMax, { path: ["value"], message: "90 % au maximum." });

export type PromoCodeInput = z.input<typeof promoCodeSchema>;

export type DbPromotion = {
  id: string;
  name: string;
  kind: "percent" | "amount";
  value: number;
  scope: "all" | "category" | "product";
  category_id: string | null;
  product_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type DbPromoCode = {
  id: string;
  code: string;
  kind: "percent" | "amount";
  value: number;
  min_order: number;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  /** Commandes non annulées qui ont utilisé ce code. */
  uses: number;
};

/** État affiché d'une promotion ou d'un code à l'instant `now`. */
export function promoStatus(p: { is_active: boolean; starts_at?: string | null; ends_at?: string | null }, now: number) {
  if (!p.is_active) return { label: "Désactivée", tone: "off" as const };
  if (p.ends_at && Date.parse(p.ends_at) <= now) return { label: "Terminée", tone: "off" as const };
  if (p.starts_at && Date.parse(p.starts_at) > now) return { label: "Programmée", tone: "soon" as const };
  return { label: "En cours", tone: "on" as const };
}
