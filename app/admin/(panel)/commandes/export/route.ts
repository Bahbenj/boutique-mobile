import { exportOrders } from "@/lib/admin/orders";
import {
  deliveryLabel,
  formatCsvDate,
  formatPhone,
  paymentLabel,
  orderStatuses,
  periods,
  statusLabels,
  variantLabel,
  type OrderStatus,
  type Period,
} from "@/lib/admin/orders-shared";
import { getAdmin } from "@/lib/auth";

/**
 * Export CSV des commandes (mêmes filtres statut / période que la liste).
 * Format Excel français : séparateur « ; », BOM UTF-8, montants en FCFA sans unité.
 */
export async function GET(request: Request) {
  if (!(await getAdmin())) return new Response("Non autorisé", { status: 401 });

  const url = new URL(request.url);
  const statut = url.searchParams.get("statut");
  const periode = url.searchParams.get("periode");
  const orders = await exportOrders({
    statut: orderStatuses.includes(statut as OrderStatus) ? (statut as OrderStatus) : undefined,
    periode: periode && periode in periods ? (periode as Period) : undefined,
  });

  const header = [
    "Numéro", "Date", "Statut", "Client", "Téléphone", "Région / commune", "Quartier / ville", "Adresse",
    "Livraison", "Paiement", "Articles", "Quantité", "Sous-total", "Frais de livraison", "Total", "Note",
  ];
  const rows = orders.map((o) => [
    o.number,
    formatCsvDate(o.created_at),
    statusLabels[o.status],
    o.customer_name,
    formatPhone(o.phone), // « 76 12 34 56 » : texte, jamais interprété comme formule
    o.region,
    o.city,
    o.address,
    deliveryLabel(o.delivery_method),
    paymentLabel(o.payment_method),
    o.items.map((i) => `${i.qty} × ${i.name}${variantLabel(i) ? ` (${variantLabel(i)})` : ""}`).join(" | "),
    o.items.reduce((n, i) => n + i.qty, 0),
    o.subtotal,
    o.delivery_fee,
    o.total,
    o.note ?? "",
  ]);

  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes-${statut ?? "toutes"}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * Cellule CSV : guillemets échappés, et neutralisation des formules
 * (une valeur saisie par un client commençant par = + - @ ne doit jamais
 * s'exécuter à l'ouverture dans Excel).
 */
function csvCell(value: string | number) {
  if (typeof value === "number") return String(value).replace(".", ",");
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
