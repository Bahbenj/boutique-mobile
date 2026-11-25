import Link from "next/link";
import { formatOrderDateLong } from "@/lib/admin/orders-shared";
import { repairWhatsapp, type DbRepair } from "@/lib/admin/repairs-shared";
import { formatMlPhoneIntl, telLink } from "@/lib/phone";
import { formatPrice } from "@/lib/utils";
import { AdminPage } from "@/components/admin/AdminPage";
import { FormSection } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { IconPhone, IconWhatsApp } from "@/components/ui/icons";
import { RepairEditor } from "./RepairEditor";
import { RepairStatusBadge } from "./RepairStatusBadge";

/**
 * Fiche d'une demande de réparation : réponse WhatsApp adaptée au statut,
 * appel, demande du client (lecture seule), suivi (statut, devis, notes).
 */
export function RepairDetail({ repair }: { repair: DbRepair }) {
  return (
    <AdminPage
      title={`Réparation ${repair.number}`}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <RepairStatusBadge status={repair.status} />
          {formatOrderDateLong(repair.created_at)}
        </span>
      }
      actions={
        <Link href="/admin/reparations" className="text-sm font-semibold text-muted hover:text-fg">
          ← Réparations
        </Link>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <a href={repairWhatsapp(repair)} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "px-3 sm:px-5")}>
          <IconWhatsApp size={18} />
          <span className="max-sm:sr-only">Répondre sur </span>WhatsApp
        </a>
        <a href={telLink(repair.phone)} className={buttonClasses("light", "md", "px-3 shadow-soft sm:px-5")}>
          <IconPhone size={18} />
          Appeler
        </a>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <FormSection title="Demande du client">
          <dl className="grid gap-4 text-[0.9375rem] sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-muted">Nom</dt>
              <dd className="font-semibold">{repair.customer_name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted">Téléphone</dt>
              <dd>
                <a href={telLink(repair.phone)} className="font-semibold tabular-nums hover:underline">
                  {formatMlPhoneIntl(repair.phone)}
                </a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-muted">Modèle</dt>
              <dd className="font-semibold">{repair.device}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-muted">Panne décrite</dt>
              <dd className="rounded-2xl bg-accent-soft p-3 break-words whitespace-pre-line">{repair.issue}</dd>
            </div>
            {repair.quote_amount != null && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-muted">Devis</dt>
                <dd className="text-2xl font-extrabold tracking-tight">{formatPrice(repair.quote_amount)}</dd>
              </div>
            )}
          </dl>
        </FormSection>

        <div className="lg:sticky lg:top-6">
          <FormSection title="Suivi">
            {/* key : formulaire réinitialisé après chaque enregistrement (données serveur à jour) */}
            <RepairEditor key={repair.updated_at} repair={repair} />
          </FormSection>
        </div>
      </div>
    </AdminPage>
  );
}
