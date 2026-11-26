"use client";

import { useState, useTransition } from "react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/(site)/compte/adresses/actions";
import type { DeliveryZone } from "@/config/site";
import { MAX_ADDRESSES, mapsLink, type SavedAddress } from "@/lib/customer-addresses";
import { formatMlPhone, phonePlaceholder } from "@/lib/phone";
import { useGeolocation } from "@/lib/use-geolocation";
import { useUI } from "@/lib/ui-store";
import { cn, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";
import { IconPin, IconPlus, IconSpinner } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

/** Choix de la zone : communes de Bamako puis régions, avec le prix de livraison. */
export function ZoneOptions({ zones }: { zones: DeliveryZone[] }) {
  return (
    <>
      {[
        { label: "District de Bamako", zones: zones.filter((z) => z.group === "bamako") },
        { label: "Régions", zones: zones.filter((z) => z.group === "region") },
      ]
        .filter((g) => g.zones.length)
        .map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} · {formatPrice(z.fee)}
              </option>
            ))}
          </optgroup>
        ))}
    </>
  );
}

/** Bouton « Partager ma position » (facultatif), avec l'état et un lien de vérification. */
export function LocateButton({ geo }: { geo: ReturnType<typeof useGeolocation> }) {
  return (
    <div>
      {geo.position ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-success">
            <IconPin size={16} />
            Position partagée
          </span>
          <a href={mapsLink(geo.position.lat, geo.position.lng)} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline-offset-4 hover:underline">
            Vérifier sur la carte
          </a>
          <button type="button" onClick={geo.clear} className="min-h-9 font-semibold text-muted hover:text-fg">
            Retirer
          </button>
        </p>
      ) : (
        <Button variant="light" onClick={geo.locate} disabled={geo.locating} className="h-11 max-sm:w-full">
          {geo.locating ? <IconSpinner size={16} /> : <IconPin size={17} />}
          {geo.locating ? "Recherche de la position…" : "Partager ma position (facultatif)"}
        </Button>
      )}
      {geo.error && <p className="mt-1.5 text-xs font-medium text-danger">{geo.error}</p>}
    </div>
  );
}

const describe = (a: SavedAddress, zones: DeliveryZone[]) => [a.address, a.city, zones.find((z) => z.id === a.zoneId)?.name].filter(Boolean).join(", ");

/** Mon compte → Mes adresses : liste, ajout, modification, suppression, adresse par défaut. */
export function AddressBook({ addresses, zones, defaults }: { addresses: SavedAddress[]; zones: DeliveryZone[]; defaults: { name: string; phone: string } }) {
  const toast = useUI((s) => s.showToast);
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? { title: done } : { title: "Pas enregistré", text: res.error, tone: "error" });
    });

  return (
    <div>
      {addresses.length ? (
        <ul className="space-y-2">
          {addresses.map((a) => (
            <li key={a.id} className={cn("rounded-2xl bg-raised/50 p-3 ring-1", a.isDefault ? "ring-accent/50" : "ring-line")}>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-bold">{a.label || a.recipientName}</span>
                {a.isDefault && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold ring-1 ring-accent/40">Par défaut</span>}
                {a.lat != null && <span className="text-xs font-semibold text-success">Position enregistrée</span>}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {a.recipientName} · {formatMlPhone(a.phone)}
              </p>
              <p className="text-sm">{describe(a, zones)}</p>
              {a.instructions && <p className="text-sm text-muted">Livreur : {a.instructions}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4">
                <button type="button" onClick={() => setEditing(a)} className="min-h-10 text-sm font-semibold text-accent">
                  Modifier
                </button>
                {!a.isDefault && (
                  <button type="button" disabled={pending} onClick={() => run(() => setDefaultAddress(a.id), "Adresse par défaut changée")} className="min-h-10 text-sm font-semibold text-fg/80">
                    Mettre par défaut
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirm(`Supprimer l'adresse « ${a.label || a.recipientName} » ? Vos commandes passées gardent leur adresse.`) && run(() => deleteAddress(a.id), "Adresse supprimée")}
                  className="min-h-10 text-sm font-semibold text-danger"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Aucune adresse enregistrée. Ajoutez la maison, le bureau… pour commander en un clic.</p>
      )}
      {addresses.length < MAX_ADDRESSES ? (
        <Button variant="light" onClick={() => setEditing("new")} className="mt-3 h-11 max-sm:w-full">
          <IconPlus size={17} />
          Ajouter une adresse
        </Button>
      ) : (
        <p className="mt-3 text-sm text-muted">{MAX_ADDRESSES} adresses au plus : supprimez-en une pour en ajouter une autre.</p>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvelle adresse" : "Modifier l'adresse"} className="max-w-lg">
        {editing !== null && <AddressForm address={editing === "new" ? null : editing} zones={zones} defaults={defaults} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

function AddressForm({ address: a, zones, defaults, onDone }: { address: SavedAddress | null; zones: DeliveryZone[]; defaults: { name: string; phone: string }; onDone: () => void }) {
  const toast = useUI((s) => s.showToast);
  const geo = useGeolocation(a?.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const get = (k: string) => String(f.get(k) ?? "");
        start(async () => {
          const res = await saveAddress({
            id: a?.id,
            label: get("label"),
            recipient_name: get("recipient_name"),
            phone: get("phone"),
            zone_id: get("zone_id"),
            city: get("city"),
            address: get("address"),
            instructions: get("instructions"),
            lat: geo.position?.lat ?? null,
            lng: geo.position?.lng ?? null,
            is_default: f.get("is_default") === "on" || Boolean(a?.isDefault),
          });
          if (!res.ok) {
            setErrors(res.fields ?? {});
            if (!res.fields) toast({ title: "Pas enregistré", text: res.error, tone: "error" });
            return;
          }
          toast({ title: a ? "Adresse modifiée" : "Adresse ajoutée" });
          onDone();
        });
      }}
      className="grid grid-cols-[minmax(0,1fr)] gap-4"
    >
      <Field label="Nom de l'adresse (facultatif)" name="label" defaultValue={a?.label} maxLength={40} placeholder="Maison, Bureau, Chez maman…" error={errors.label} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Field label="Destinataire *" name="recipient_name" autoComplete="name" defaultValue={a?.recipientName ?? defaults.name} error={errors.recipient_name} />
        <Field
          label="Téléphone *"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={phonePlaceholder}
          defaultValue={a ? formatMlPhone(a.phone) : defaults.phone}
          error={errors.phone}
        />
      </div>
      <SelectField label="Zone de livraison *" name="zone_id" defaultValue={a?.zoneId ?? ""} error={errors.zone_id}>
        <option value="" disabled>
          Choisir…
        </option>
        <ZoneOptions zones={zones} />
      </SelectField>
      <Field label="Quartier" name="city" autoComplete="address-level2" defaultValue={a?.city} placeholder="Ex. Kalaban Coura" error={errors.city} />
      <TextareaField
        label="Rue, porte et repère *"
        name="address"
        defaultValue={a?.address}
        rows={2}
        maxLength={300}
        placeholder="Ex. Rue 45, porte 12, derrière la pharmacie Kalaban, portail bleu"
        error={errors.address}
      />
      <TextareaField
        label="Consignes pour le livreur (facultatif)"
        name="instructions"
        defaultValue={a?.instructions}
        rows={2}
        maxLength={300}
        placeholder="Ex. Appeler en arrivant, sonner deux fois"
        error={errors.instructions}
      />
      <LocateButton geo={geo} />
      {!a?.isDefault && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input type="checkbox" name="is_default" className="size-5 accent-[var(--accent)]" />
          Utiliser par défaut pour mes commandes
        </label>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="light" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <IconSpinner size={16} />}
          {a ? "Enregistrer" : "Ajouter l'adresse"}
        </Button>
      </div>
    </form>
  );
}
