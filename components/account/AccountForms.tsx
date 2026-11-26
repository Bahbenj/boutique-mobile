"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteMyAccount, saveMyInfo, signOutCustomer, type AuthState } from "@/app/(site)/compte/actions";
import type { DeliveryZone } from "@/config/site";
import { phoneHint } from "@/lib/phone";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { IconLogout, IconSpinner } from "@/components/ui/icons";
import { Alert } from "./AuthForms";

const initial: AuthState = {};

function Submit({ children, pendingLabel, className, danger }: { children: React.ReactNode; pendingLabel: string; className?: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={danger ? `bg-danger text-canvas hover:brightness-110 ${className ?? ""}` : className}>
      {pending && <IconSpinner size={16} />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

export type MyInfo = { fullName: string; phone: string; zoneId: string | null; city: string; address: string };

/** Mes informations et adresse de livraison par défaut (pré-remplit la commande). */
export function MyInfoForm({ info, zones }: { info: MyInfo; zones: DeliveryZone[] }) {
  const [state, action] = useActionState(saveMyInfo, initial);
  const f = state.fields ?? {};
  const groups = [
    { label: "District de Bamako", zones: zones.filter((z) => z.group === "bamako") },
    { label: "Régions", zones: zones.filter((z) => z.group === "region") },
  ].filter((g) => g.zones.length);
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Field label="Nom complet" name="full_name" autoComplete="name" defaultValue={info.fullName} required error={f.full_name} />
      <Field label="Téléphone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" defaultValue={info.phone} hint={phoneHint} required error={f.phone} />
      <SelectField label="Zone de livraison" name="zone_id" defaultValue={info.zoneId ?? ""} error={f.zone_id}>
        <option value="">Choisir plus tard</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>
      <Field label="Quartier, ville" name="city" autoComplete="address-level2" defaultValue={info.city} error={f.city} />
      <Field label="Adresse ou repère" name="address" autoComplete="street-address" defaultValue={info.address} error={f.address} className="sm:col-span-2" />
      {(state.error || state.notice) && (
        <div className="sm:col-span-2">
          <Alert tone={state.error ? "error" : "ok"}>{state.error ?? state.notice}</Alert>
        </div>
      )}
      <Submit pendingLabel="Enregistrement…" className="max-sm:w-full sm:justify-self-start">
        Enregistrer
      </Submit>
    </form>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutCustomer} className={className}>
      <SignOutSubmit />
    </form>
  );
}
function SignOutSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="light" disabled={pending} className="max-sm:w-full">
      {pending ? <IconSpinner size={16} /> : <IconLogout size={17} />}
      Se déconnecter
    </Button>
  );
}

/** Suppression du compte : il faut taper SUPPRIMER (pas de suppression par erreur). */
export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteMyAccount, initial);
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Field label="Pour confirmer, tapez SUPPRIMER" name="confirm" autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
      {state.error && <Alert>{state.error}</Alert>}
      <Submit pendingLabel="Suppression…" danger className="max-sm:w-full sm:justify-self-start">
        Supprimer définitivement mon compte
      </Submit>
    </form>
  );
}
