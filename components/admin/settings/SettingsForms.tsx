"use client";

import { useState, useTransition } from "react";
import { saveDelivery, savePayments } from "@/app/admin/(panel)/parametres/actions";
import { fieldErrors, parseAmount, slugify } from "@/lib/admin/schema";
import { deliverySchema, paymentSchema, type DeliveryInput, type PaymentInput } from "@/lib/admin/settings-schema";
import { useUI } from "@/lib/ui-store";
import { cn, formatAmount } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconPlus, IconSpinner } from "@/components/ui/icons";
import { FormSection, Switch } from "../ui";

const input =
  "h-11 w-full min-w-0 rounded-2xl border border-line bg-raised px-3.5 text-[1rem] text-fg outline-none placeholder:text-fg/45 " +
  "focus:border-accent focus:ring-4 focus:ring-accent/25 aria-[invalid=true]:border-danger";

const amountText = (v: number | null | undefined) => (v == null ? "" : formatAmount(v));

/** Premier message d'erreur dont la clé commence par `prefix`. */
const firstError = (errors: Record<string, string>, prefix: string) =>
  Object.entries(errors).find(([k]) => k === prefix || k.startsWith(prefix + "."))?.[1];

// --- Livraison -----------------------------------------------------------------

type ZoneRow = Omit<DeliveryInput["zones"][number], "fee"> & { fee: string };

export function DeliverySettingsForm({ initial }: { initial: DeliveryInput }) {
  const toast = useUI((s) => s.showToast);
  const [freeFrom, setFreeFrom] = useState(amountText(initial.free_from));
  const [pickup, setPickup] = useState(initial.pickup);
  const [zones, setZones] = useState<ZoneRow[]>(initial.zones.map((z) => ({ ...z, fee: amountText(z.fee) })));
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<"bamako" | "region">("region");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  const updateZone = (id: string, patch: Partial<ZoneRow>) => {
    setZones((list) => list.map((z) => (z.id === id ? { ...z, ...patch } : z)));
    setDirty(true);
  };

  const addZone = () => {
    const name = newName.trim();
    const id = slugify(name);
    if (name.length < 2 || !id) return setErrors({ newZone: "Saisissez le nom de la zone (2 caractères minimum)." });
    if (zones.some((z) => z.id === id)) return setErrors({ newZone: "Cette zone existe déjà." });
    setZones((list) => [...list, { id, name, zone_group: newGroup, fee: "", delay: "", is_active: true, isNew: true }]);
    setNewName("");
    setErrors({});
    setDirty(true);
  };

  const submit = () => {
    const payload: DeliveryInput = {
      free_from: parseAmount(freeFrom),
      pickup,
      zones: zones.map((z) => ({ ...z, fee: parseAmount(z.fee) ?? NaN })),
    };
    const check = deliverySchema.safeParse(payload);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      toast({ title: "Non enregistré", text: "Certains champs sont à corriger." });
      return;
    }
    startTransition(async () => {
      const res = await saveDelivery(payload);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Non enregistré", text: res.error });
        return;
      }
      setErrors({});
      setDirty(false);
      setZones((list) => list.map((z) => ({ ...z, isNew: false })));
      toast({ title: "Livraison enregistrée", text: "Les nouveaux frais s'appliquent dès maintenant sur le site." });
    });
  };

  const groups = [
    { id: "bamako" as const, label: "District de Bamako" },
    { id: "region" as const, label: "Régions et autres villes" },
  ];

  return (
    <FormSection title="Livraison" description="Livraison dans tout le Mali : frais et délai par zone. Une zone désactivée n'est plus proposée aux clients.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Livraison offerte dès (FCFA)"
          inputMode="numeric"
          value={freeFrom}
          placeholder="Vide = jamais offerte"
          onChange={(e) => {
            setFreeFrom(e.target.value);
            setDirty(true);
          }}
          error={errors.free_from}
          hint="Montant du panier à partir duquel la livraison est gratuite."
        />
      </div>

      <div className="mt-6 rounded-2xl bg-raised/60 p-4 ring-1 ring-line">
        <Switch
          checked={pickup.enabled}
          onChange={(enabled) => {
            setPickup({ ...pickup, enabled });
            setDirty(true);
          }}
          label="Retrait en magasin (gratuit)"
          showLabel
        />
        {pickup.enabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Libellé"
              value={pickup.label}
              onChange={(e) => {
                setPickup({ ...pickup, label: e.target.value });
                setDirty(true);
              }}
              error={errors["pickup.label"]}
            />
            <Field
              label="Délai"
              value={pickup.delay}
              placeholder="Sous 2 h"
              onChange={(e) => {
                setPickup({ ...pickup, delay: e.target.value });
                setDirty(true);
              }}
              error={errors["pickup.delay"]}
            />
          </div>
        )}
      </div>

      {groups.map((g) => {
        const list = zones.filter((z) => z.zone_group === g.id);
        if (!list.length) return null;
        return (
          <div key={g.id} className="mt-6">
            <h3 className="text-sm font-bold text-muted">{g.label}</h3>
            <ul className="mt-2 divide-y divide-line rounded-2xl ring-1 ring-line">
              {list.map((z) => {
                const i = zones.indexOf(z);
                const feeError = errors[`zones.${i}.fee`];
                return (
                  <li key={z.id} className={cn("grid gap-2 p-3 sm:grid-cols-[1.4fr_9rem_8rem_auto] sm:items-center", !z.is_active && "opacity-60")}>
                    <input
                      aria-label={`Nom de la zone ${z.name}`}
                      value={z.name}
                      onChange={(e) => updateZone(z.id, { name: e.target.value })}
                      aria-invalid={Boolean(errors[`zones.${i}.name`]) || undefined}
                      className={cn(input, "font-semibold")}
                    />
                    <label className="relative">
                      <span className="sr-only">Frais pour {z.name} (FCFA)</span>
                      <input
                        inputMode="numeric"
                        value={z.fee}
                        placeholder="0"
                        onChange={(e) => updateZone(z.id, { fee: e.target.value })}
                        aria-invalid={Boolean(feeError) || undefined}
                        className={cn(input, "pe-14 tabular-nums")}
                      />
                      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">FCFA</span>
                    </label>
                    <input
                      aria-label={`Délai pour ${z.name}`}
                      value={z.delay}
                      placeholder="Délai"
                      onChange={(e) => updateZone(z.id, { delay: e.target.value })}
                      className={input}
                    />
                    <Switch checked={z.is_active} onChange={(is_active) => updateZone(z.id, { is_active })} label={`Zone ${z.name} active`} />
                    {(feeError || errors[`zones.${i}.name`]) && (
                      <p className="text-xs font-medium text-danger sm:col-span-4">{feeError ?? errors[`zones.${i}.name`]}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="mt-6 rounded-2xl bg-raised/60 p-4 ring-1 ring-line">
        <h3 className="text-sm font-bold">Ajouter une zone</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
          <Field label="Nom" value={newName} placeholder="Ex. Kati" onChange={(e) => setNewName(e.target.value)} error={errors.newZone} />
          <SelectField label="Groupe" value={newGroup} onChange={(e) => setNewGroup(e.target.value as "bamako" | "region")}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </SelectField>
          <Button variant="light" onClick={addZone} className="h-12">
            <IconPlus size={18} />
            Ajouter
          </Button>
        </div>
      </div>

      {firstError(errors, "zones") && !Object.keys(errors).some((k) => /^zones\.\d/.test(k)) && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger-soft p-3 text-sm text-danger">
          {firstError(errors, "zones")}
        </p>
      )}

      <SaveBar pending={pending} dirty={dirty} onSave={submit} />
    </FormSection>
  );
}

// --- Paiement --------------------------------------------------------------------

export function PaymentSettingsForm({ initial }: { initial: PaymentInput }) {
  const toast = useUI((s) => s.showToast);
  const [methods, setMethods] = useState(initial.methods);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (id: string, patch: Partial<PaymentInput["methods"][number]>) => {
    setMethods((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDirty(true);
  };

  const submit = () => {
    const payload = { methods };
    const check = paymentSchema.safeParse(payload);
    if (!check.success) {
      setErrors(fieldErrors(check.error));
      return;
    }
    startTransition(async () => {
      const res = await savePayments(payload);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        toast({ title: "Non enregistré", text: res.error });
        return;
      }
      setErrors({});
      setDirty(false);
      toast({ title: "Paiement enregistré", text: "Les modes activés sont proposés dès maintenant sur le site." });
    });
  };

  return (
    <FormSection
      title="Paiement"
      description="Aucun paiement en ligne : le client choisit un mode, vous lui envoyez les instructions par WhatsApp. Seuls les modes activés sont proposés."
    >
      <ul className="space-y-3">
        {methods.map((m, i) => (
          <li key={m.id} className={cn("rounded-2xl p-4 ring-1", m.enabled ? "bg-accent-soft/60 ring-accent/30" : "bg-raised/40 ring-line")}>
            <Switch checked={m.enabled} onChange={(enabled) => update(m.id, { enabled })} label={m.label} showLabel />
            {m.enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.6fr]">
                {m.id !== "cod" && (
                  <Field
                    label={m.id === "virement" ? "Coordonnées bancaires" : "Numéro du magasin"}
                    value={m.account}
                    onChange={(e) => update(m.id, { account: e.target.value })}
                    error={errors[`methods.${i}.account`]}
                  />
                )}
                <TextareaField
                  label="Message affiché au client"
                  value={m.instructions}
                  rows={2}
                  onChange={(e) => update(m.id, { instructions: e.target.value })}
                  className={m.id === "cod" ? "sm:col-span-2" : undefined}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      {errors.methods && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger-soft p-3 text-sm text-danger">
          {errors.methods}
        </p>
      )}
      <SaveBar pending={pending} dirty={dirty} onSave={submit} />
    </FormSection>
  );
}

function SaveBar({ pending, dirty, onSave }: { pending: boolean; dirty: boolean; onSave: () => void }) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
      {dirty && !pending && <span className="text-sm text-muted">Modifications non enregistrées</span>}
      <Button onClick={onSave} disabled={pending || !dirty}>
        {pending && <IconSpinner size={16} />}
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}
