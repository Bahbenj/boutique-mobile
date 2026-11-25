import Link from "next/link";
import type { Customer } from "@/lib/admin/customers";
import { formatMlPhone, telLink, waNumber } from "@/lib/phone";
import { formatPrice } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { IconPhone, IconReceipt, IconWhatsApp, IconWrench } from "@/components/ui/icons";

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Bamako" });

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Cartes clients : coordonnées, achats, réparations, contact en un geste. */
export function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
      {customers.map((c) => {
        const hello = `Bonjour ${c.name.split(" ")[0]}, `;
        return (
          <li key={c.phone} className="rounded-card bg-surface p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-sm font-extrabold text-fg">
                {c.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-bold break-words">{c.name}</p>
                <p className="text-sm text-muted tabular-nums">{formatMlPhone(c.phone)}</p>
              </div>
            </div>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {c.totalSpent > 0 && (
                <span className="inline-flex min-h-8 items-center gap-1">
                  <strong className="tabular-nums">{formatPrice(c.totalSpent)}</strong>
                  <span className="text-muted">dépensés</span>
                </span>
              )}
              {c.ordersCount > 0 && (
                <Link href={`/admin/commandes?q=${c.phone}`} className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:underline">
                  <IconReceipt size={15} className="text-muted" />
                  {plural(c.ordersCount, "commande")}
                </Link>
              )}
              {c.repairsCount > 0 && (
                <Link href={`/admin/reparations?q=${c.phone}`} className="inline-flex min-h-8 items-center gap-1.5 font-semibold hover:underline">
                  <IconWrench size={15} className="text-muted" />
                  {plural(c.repairsCount, "réparation")}
                </Link>
              )}
              <span className="inline-flex min-h-8 items-center text-muted">Vu le {day.format(new Date(c.lastActivity))}</span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <a
                href={`https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(hello)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("whatsapp", "md", "h-11 w-full px-3")}
              >
                <IconWhatsApp size={18} />
                WhatsApp
              </a>
              <a href={telLink(c.phone)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-raised text-sm font-semibold ring-1 ring-line hover:bg-fg/5">
                <IconPhone size={17} />
                Appeler
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
