import Link from "next/link";
import type { CustomerAccount } from "@/lib/admin/customers";
import { formatMlPhone, telLink, waNumber } from "@/lib/phone";
import { formatPrice } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { IconPhone, IconReceipt, IconWhatsApp } from "@/components/ui/icons";

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Bamako" });

/** Comptes clients inscrits sur le site (jamais l'équipe) : identité, commandes, contact. */
export function AccountList({ accounts }: { accounts: CustomerAccount[] }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
      {accounts.map((a) => (
        <li key={a.userId} className="rounded-card bg-surface p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-sm font-extrabold text-fg">
              {(a.fullName || a.email).trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-bold break-words">{a.fullName || "Nom non renseigné"}</p>
              <p className="truncate text-sm text-muted">{a.email}</p>
              <p className="text-sm text-muted tabular-nums">{a.phone ? formatMlPhone(a.phone) : "Téléphone à compléter"}</p>
            </div>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-semibold">{a.provider === "google" ? "Google" : "E-mail"}</span>
            {!a.emailConfirmed && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">E-mail non confirmé</span>}
            {a.ordersCount > 0 ? (
              <Link href={`/admin/commandes?q=${a.phone ?? ""}`} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
                <IconReceipt size={15} className="text-muted" />
                {a.ordersCount} commande{a.ordersCount > 1 ? "s" : ""} · {formatPrice(a.totalSpent)}
              </Link>
            ) : (
              <span className="text-muted">Aucune commande</span>
            )}
            <span className="text-muted">Inscrit le {day.format(new Date(a.createdAt))}</span>
          </p>
          {a.phone && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <a href={`https://wa.me/${waNumber(a.phone)}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "h-11 w-full px-3")}>
                <IconWhatsApp size={18} />
                WhatsApp
              </a>
              <a href={telLink(a.phone)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-raised text-sm font-semibold ring-1 ring-line hover:bg-fg/5">
                <IconPhone size={17} />
                Appeler
              </a>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
