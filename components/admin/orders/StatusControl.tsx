"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/admin/(panel)/commandes/actions";
import { nextStep, orderStatuses, statusLabels, type OrderStatus } from "@/lib/admin/orders-shared";
import { useUI } from "@/lib/ui-store";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "../ui";

/**
 * Actions sur le statut : étape suivante en un geste, annulation (avec
 * confirmation : remet les articles en stock) et correction manuelle.
 */
export function StatusControl({ id, number, status }: { id: string; number: string; status: OrderStatus }) {
  const toast = useUI((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = nextStep[status];

  const change = (to: OrderStatus) =>
    startTransition(async () => {
      const res = await updateOrderStatus({ id, status: to });
      setConfirmCancel(false);
      toast(res.ok ? { title: `${number} : ${statusLabels[to]}` } : { title: "Statut non modifié", text: res.error });
    });

  return (
    <div className="space-y-3">
      {next && (
        <Button size="lg" className="w-full" disabled={pending} onClick={() => change(next.status)}>
          {pending ? "Enregistrement…" : next.label}
        </Button>
      )}
      {status === "annulee" && (
        <p className="rounded-2xl bg-cream-deep p-3 text-sm text-muted">
          Commande annulée : les articles ont été remis en stock. La réactiver reprend le stock.
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">Corriger le statut</span>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => {
            const to = e.target.value as OrderStatus;
            if (to === "annulee") setConfirmCancel(true);
            else change(to);
          }}
          className="h-11 w-full rounded-2xl border border-line bg-white px-3 text-[0.9375rem] font-semibold outline-none focus:border-ink focus:ring-4 focus:ring-accent/25"
        >
          {orderStatuses.map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </label>

      {status !== "annulee" && status !== "livree" && (
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          disabled={pending}
          className="h-10 w-full rounded-full text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Annuler la commande
        </button>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title={`Annuler la commande ${number} ?`}
        confirmLabel="Annuler la commande"
        cancelLabel="Garder la commande"
        pendingLabel="Annulation…"
        pending={pending}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => change("annulee")}
      >
        <p>Les articles seront remis en stock automatiquement.</p>
        <p className="mt-2">Pensez à prévenir le client (bouton WhatsApp).</p>
      </ConfirmDialog>
    </div>
  );
}
