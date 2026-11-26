import { z } from "zod";

/**
 * Carnet d'adresses du client (migration 25) : type partagé navigateur / serveur
 * et validation (zod) appliquée par les Server Actions avant l'écriture ; la base
 * revérifie (RLS, contraintes, 10 adresses au plus).
 */
export type SavedAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string; // 8 chiffres
  zoneId: string;
  city: string;
  address: string;
  instructions: string;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
};

export const MAX_ADDRESSES = 10;

export const addressSchema = z
  .object({
    id: z.uuid().optional(),
    label: z.string().trim().max(40, "40 caractères maximum."),
    recipient_name: z.string().trim().min(2, "Indiquez le nom du destinataire.").max(80, "80 caractères maximum."),
    phone: z.string().regex(/^[2-9]\d{7}$/, "Numéro malien invalide : 8 chiffres, ex. 76 12 34 56."),
    zone_id: z.string().min(1, "Choisissez la zone de livraison.").max(60),
    city: z.string().trim().max(80, "80 caractères maximum."),
    address: z.string().trim().min(3, "Indiquez la rue ou un repère (ex. derrière la pharmacie).").max(300, "300 caractères maximum."),
    instructions: z.string().trim().max(300, "300 caractères maximum."),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    is_default: z.boolean(),
  })
  .refine((d) => (d.lat === null) === (d.lng === null), { path: ["lat"], message: "Position incomplète." });

export type AddressInput = z.input<typeof addressSchema>;

export const toSavedAddress = (r: Record<string, unknown>): SavedAddress => ({
  id: String(r.id),
  label: String(r.label ?? ""),
  recipientName: String(r.recipient_name ?? ""),
  phone: String(r.phone ?? ""),
  zoneId: String(r.zone_id ?? ""),
  city: String(r.city ?? ""),
  address: String(r.address ?? ""),
  instructions: String(r.instructions ?? ""),
  lat: r.lat == null ? null : Number(r.lat),
  lng: r.lng == null ? null : Number(r.lng),
  isDefault: r.is_default === true,
});

/** Lien Google Maps vers une position partagée. */
export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
