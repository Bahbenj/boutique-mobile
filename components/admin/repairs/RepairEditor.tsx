"use client";

import { useState, useTransition } from "react";
import { updateRepair } from "@/app/admin/(panel)/reparations/actions";
import { repairNextStep, repairStatuses, repairStatusLabels, repairUpdateSchema, type DbRepair, type RepairStatus } from "@/lib/admin/repairs-shared";
import { fieldErrors, parseAmount } from "@/lib/admin/schema";
import { useUI } from "@/lib/ui-store";
import { formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";

/**
 * Suivi d'une demande : étape suivante en un geste, correction du statut,
 * prix du devis (FCFA) et notes internes (jamais montrées au client).
 */
export function RepairEditor({ repair }: { repair: DbRepair }) {
  const toast = useUI((s) => s.showToast);
  const [pending, startTransition] = useTransition();
  const [quote, setQuote] = useState(repair.quote_amount == null ? "" : formatAmount(repair.quote_amount));
  const [notes, setNotes] = useState(repair.internal_notes);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const next = repairNextStep[repair.status];
  const dirty = notes !== repair.internal_notes || (parseAmount(quote) ?? null) !== repair.quote_amount;

  const save = (patch: { status?: RepairStatus; quote_amount?: number | null; internal_notes?: string }, success: string) => {
    const input = { id: repair.id, ...patch };
    const check = repairUpdateSchema.safeParse(input);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    startTransition(async () => {
      const res = await updateRepair(input);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Non enregistré", text: res.error });
        return;
      }
      setErrors({});
      toast({ title: success });
    });
  };

  const saveDetails = () => save({ quote_amount: parseAmount(quote) ?? null, internal_notes: notes }, "Devis et notes enregistrés");

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {next && (
          <Button size="lg" className="w-full" disabled={pending} onClick={() => save({ status: next.status }, `${repair.number} : ${repairStatusLabels[next.status]}`)}>
            {pending ? "Enregistrement…" : next.label}
          </Button>
        )}
        <SelectField
          label="Corriger le statut"
          value={repair.status}
          disabled={pending}
          onChange={(e) => save({ status: e.target.value as RepairStatus }, `${repair.number} : ${repairStatusLabels[e.target.value as RepairStatus]}`)}
        >
          {repairStatuses.map((s) => (
            <option key={s} value={s}>
              {repairStatusLabels[s]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="space-y-4 border-t border-line pt-5">
        <Field
          label="Prix du devis (FCFA)"
          inputMode="numeric"
          value={quote}
          placeholder="Ex. 25 000"
          onChange={(e) => setQuote(e.target.value)}
          error={errors.quote_amount}
          hint="Repris dans le message WhatsApp « Devis envoyé »."
        />
        <TextareaField
          label="Notes internes"
          value={notes}
          rows={4}
          maxLength={2000}
          placeholder="Diagnostic, pièce à commander, délai annoncé au client…"
          onChange={(e) => setNotes(e.target.value)}
        />
        {errors.internal_notes && <p className="-mt-3 text-xs font-medium text-danger">{errors.internal_notes}</p>}
        <Button variant="light" className="w-full" disabled={pending || !dirty} onClick={saveDetails}>
          {pending ? "Enregistrement…" : "Enregistrer le devis et les notes"}
        </Button>
        <p className="text-xs text-muted">Les notes internes ne sont jamais envoyées au client.</p>
      </div>
    </div>
  );
}
