import { z } from "zod";
import { paymentMethodIds } from "@/config/site";
import { SLUG_RE } from "./schema";

/**
 * Schémas des paramètres (livraison, paiement) et des avis clients.
 * Partagés navigateur / serveur : le formulaire affiche les erreurs, le
 * serveur revalide TOUJOURS avant d'écrire.
 */

const fcfa = (label: string) =>
  z
    .number({ error: `${label} : montant invalide (nombre entier en FCFA).` })
    .int(`${label} : le franc CFA n'a pas de décimales.`)
    .min(0, `${label} : montant invalide.`)
    .max(10_000_000, `${label} : montant trop élevé.`);

// --- Livraison ---------------------------------------------------------------

export const zoneSchema = z.object({
  id: z.string().trim().regex(SLUG_RE, "Identifiant invalide.").max(60),
  name: z.string().trim().min(2, "Nom requis.").max(80, "80 caractères maximum."),
  zone_group: z.enum(["bamako", "region"]),
  fee: fcfa("Frais"),
  delay: z.string().trim().max(40, "40 caractères maximum."),
  is_active: z.boolean(),
  /** Zone ajoutée dans l'admin (pas encore en base). */
  isNew: z.boolean().optional(),
});

export const deliverySchema = z
  .object({
    free_from: fcfa("Livraison offerte dès").nullable(),
    pickup: z.object({
      enabled: z.boolean(),
      label: z.string().trim().min(2, "Libellé requis.").max(60),
      delay: z.string().trim().max(40),
    }),
    zones: z.array(zoneSchema).min(1).max(200),
  })
  .refine((d) => d.pickup.enabled || d.zones.some((z) => z.is_active), {
    message: "Activez au moins une zone de livraison ou le retrait en magasin.",
    path: ["zones"],
  })
  .refine((d) => new Set(d.zones.map((z) => z.id)).size === d.zones.length, {
    message: "Deux zones portent le même nom.",
    path: ["zones"],
  });

export type DeliveryInput = z.input<typeof deliverySchema>;
export type ZoneInput = z.input<typeof zoneSchema>;

// --- Paiement ------------------------------------------------------------------

export const paymentMethodSchema = z.object({
  id: z.enum(paymentMethodIds),
  label: z.string().trim().min(2, "Libellé requis.").max(60),
  account: z.string().trim().max(120, "120 caractères maximum."),
  instructions: z.string().trim().max(300, "300 caractères maximum."),
  enabled: z.boolean(),
});

export const paymentSchema = z
  .object({ methods: z.array(paymentMethodSchema).min(1).max(20) })
  .refine((p) => p.methods.some((m) => m.enabled), { message: "Activez au moins un mode de paiement.", path: ["methods"] })
  .refine((p) => new Set(p.methods.map((m) => m.id)).size === p.methods.length, { message: "Mode de paiement en double.", path: ["methods"] });

export type PaymentInput = z.input<typeof paymentSchema>;

// --- Avis clients ----------------------------------------------------------------

export const reviewSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Nom requis.").max(60, "60 caractères maximum."),
  city: z.string().trim().max(60, "60 caractères maximum."),
  rating: z.number().int().min(1, "Note de 1 à 5.").max(5, "Note de 1 à 5."),
  text: z.string().trim().min(5, "Texte de l'avis requis.").max(600, "600 caractères maximum."),
  product: z
    .string()
    .trim()
    .max(80, "80 caractères maximum.")
    .transform((v) => v || null),
  is_published: z.boolean(),
});

export type ReviewInput = z.input<typeof reviewSchema>;

export type DbReview = {
  id: string;
  name: string;
  city: string;
  rating: number;
  text: string;
  product: string | null;
  is_published: boolean;
  position: number;
  created_at: string;
};
