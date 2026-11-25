import { z } from "zod";
import { siteConfig } from "@/config/site";
import { waNumber } from "@/lib/phone";
import { formatPrice } from "@/lib/utils";

/** Demandes de réparation : statuts, types, messages (partagés navigateur / serveur). */

export const repairStatuses = ["nouvelle", "devis_envoye", "en_cours", "prete", "recuperee", "annulee"] as const;
export type RepairStatus = (typeof repairStatuses)[number];

export const repairStatusLabels: Record<RepairStatus, string> = {
  nouvelle: "Nouvelle",
  devis_envoye: "Devis envoyé",
  en_cours: "En cours",
  prete: "Prête",
  recuperee: "Récupérée",
  annulee: "Annulée",
};

/** Demandes « à traiter » : alerte du tableau de bord. */
export const repairPending: RepairStatus[] = ["nouvelle"];

/** Étape suivante du circuit normal (bouton principal de la fiche). */
export const repairNextStep: Partial<Record<RepairStatus, { status: RepairStatus; label: string }>> = {
  nouvelle: { status: "devis_envoye", label: "Devis envoyé" },
  devis_envoye: { status: "en_cours", label: "Réparation commencée" },
  en_cours: { status: "prete", label: "Téléphone prêt" },
  prete: { status: "recuperee", label: "Récupéré par le client" },
};

export type DbRepair = {
  id: string;
  number: string;
  customer_name: string;
  phone: string;
  device: string;
  issue: string;
  status: RepairStatus;
  quote_amount: number | null;
  internal_notes: string;
  created_at: string;
  updated_at: string;
};

/** Mise à jour du suivi par l'admin (seules colonnes modifiables, cf. migration 13). */
export const repairUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(repairStatuses).optional(),
  quote_amount: z
    .number({ error: "Montant invalide (nombre entier en FCFA)." })
    .int("Le franc CFA n'a pas de décimales.")
    .min(0, "Montant invalide.")
    .max(10_000_000, "Montant trop élevé.")
    .nullable()
    .optional(),
  internal_notes: z.string().max(2000, "2 000 caractères maximum.").optional(),
});
export type RepairUpdate = z.input<typeof repairUpdateSchema>;

/** Message WhatsApp au client selon le statut de sa demande. */
export function repairMessage(r: Pick<DbRepair, "number" | "customer_name" | "device" | "status" | "quote_amount">) {
  const firstName = r.customer_name.trim().split(/\s+/)[0];
  const hello = `Bonjour ${firstName}, ici ${siteConfig.name}.`;
  const quote = r.quote_amount != null ? formatPrice(r.quote_amount) : null;
  switch (r.status) {
    case "nouvelle":
      return `${hello} Nous avons bien reçu votre demande ${r.number} pour votre ${r.device}. Pouvez-vous nous envoyer une photo de la panne, ou passer au magasin pour un diagnostic ?`;
    case "devis_envoye":
      return quote
        ? `${hello} Devis pour votre ${r.device} (demande ${r.number}) : ${quote}. Répondez « OK » pour lancer la réparation.`
        : `${hello} Voici le devis pour votre ${r.device} (demande ${r.number}) : …`;
    case "en_cours":
      return `${hello} La réparation de votre ${r.device} (demande ${r.number}) est en cours. Nous vous prévenons dès qu'il est prêt.`;
    case "prete":
      return `${hello} Bonne nouvelle : votre ${r.device} est prêt (demande ${r.number}). Vous pouvez passer le récupérer au magasin${quote ? ` ; montant à régler : ${quote}` : ""}.`;
    case "recuperee":
      return `${hello} Merci pour votre confiance ! Si vous avez la moindre question sur votre ${r.device}, nous restons disponibles ici.`;
    case "annulee":
      return `${hello} Votre demande ${r.number} est annulée. N'hésitez pas à nous écrire si vous changez d'avis.`;
  }
}

export const repairWhatsapp = (r: Parameters<typeof repairMessage>[0] & { phone: string }) =>
  `https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(repairMessage(r))}`;
