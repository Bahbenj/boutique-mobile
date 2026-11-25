"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { submitRepairRequest, type RepairRequestResult } from "@/app/(site)/reparation/actions";
import { siteConfig } from "@/config/site";
import { formatMlPhoneIntl, normalizeMlPhone, phoneError, phoneHint, phonePlaceholder } from "@/lib/phone";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/Button";
import { Field, TextareaField } from "@/components/ui/Field";
import { IconCheck, IconSpinner, IconWhatsApp } from "@/components/ui/icons";

type Fields = "name" | "phone" | "device" | "issue";
type Errors = Partial<Record<Fields, string>>;

/**
 * Formulaire de devis de réparation : enregistre la demande en base
 * (submitRepairRequest), puis ouvre WhatsApp avec un message pré-rempli
 * portant le numéro de la demande. Si la base est indisponible, le message
 * part quand même (sans numéro) : aucune demande n'est perdue.
 */
export function RepairQuoteForm() {
  const startedAt = useRef(0);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ link: string; number: string | null } | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const values = { name: get("name"), phone: get("phone"), device: get("device"), issue: get("issue") };

    const next: Errors = {};
    if (values.name.length < 2) next.name = "Indiquez votre nom.";
    if (!normalizeMlPhone(values.phone)) next.phone = phoneError;
    if (values.device.length < 2) next.device = "Indiquez le modèle du téléphone.";
    if (values.issue.length < 3) next.issue = "Décrivez la panne en quelques mots.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) {
      formEl.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }

    setPending(true);
    let result: RepairRequestResult;
    try {
      result = await submitRepairRequest({ ...values, website: get("website") || undefined, startedAt: startedAt.current });
    } catch {
      result = { ok: false, fallback: true, error: "Connexion impossible." };
    }
    setPending(false);

    if (!result.ok && !result.fallback) {
      setErrors(result.fields ?? {});
      setFormError(result.error);
      return;
    }

    const number = result.ok ? result.number : null;
    const phone = normalizeMlPhone(values.phone)!;
    const message = [
      `Bonjour ${siteConfig.name}, je voudrais un devis de réparation${number ? ` (demande ${number})` : ""}.`,
      `Modèle du téléphone : ${values.device}`,
      `Panne constatée : ${values.issue}`,
      `Nom : ${values.name}`,
      `Téléphone : ${formatMlPhoneIntl(phone)}`,
    ].join("\n");
    const link = whatsappLink(message);
    setSent({ link, number });
    formEl.reset();
    // Ouverture automatique ; souvent bloquée après un appel réseau (mobile) : le bouton reste affiché
    window.open(link, "_blank", "noopener,noreferrer");
  };

  if (sent) {
    return (
      <div role="status" className="rounded-card bg-surface p-6 text-center shadow-soft sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success text-canvas">
          <IconCheck size={26} strokeWidth={2.5} />
        </span>
        <h3 className="mt-5 text-2xl font-extrabold">{sent.number ? `Demande ${sent.number} enregistrée` : "Demande prête à envoyer"}</h3>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Envoyez-nous le message sur WhatsApp, avec une photo de la panne si possible : nous vous répondons avec un devis.
        </p>
        <Button href={sent.link} variant="whatsapp" size="lg" className="mt-6 max-sm:w-full max-sm:whitespace-normal">
          <IconWhatsApp size={20} />
          Envoyer sur WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative rounded-card bg-surface p-5 shadow-soft sm:p-8">
      {/* Champ piège invisible : seuls les robots le remplissent */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Votre nom" name="name" autoComplete="name" maxLength={80} required error={errors.name} />
        <Field
          label="Téléphone (WhatsApp)"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={phonePlaceholder}
          hint={phoneHint}
          required
          error={errors.phone}
        />
        <Field
          label="Modèle du téléphone"
          name="device"
          placeholder="Ex. Samsung Galaxy A15, Tecno Spark 20"
          maxLength={80}
          required
          error={errors.device}
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <TextareaField
            label="Panne constatée"
            name="issue"
            rows={3}
            maxLength={1000}
            placeholder="Ex. écran cassé, ne charge plus, téléphone bloqué…"
            aria-invalid={errors.issue ? true : undefined}
          />
          {errors.issue && <p className="mt-1.5 text-xs font-medium text-danger">{errors.issue}</p>}
        </div>
      </div>
      {formError && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger-soft p-3 text-sm font-medium text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" variant="whatsapp" size="lg" className="mt-5 w-full max-sm:whitespace-normal" disabled={pending} aria-busy={pending || undefined}>
        {pending ? <IconSpinner size={18} /> : <IconWhatsApp size={20} />}
        {pending ? "Enregistrement…" : "Demander un devis sur WhatsApp"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted">Vous recevez le prix avant toute intervention : vous décidez ensuite.</p>
    </form>
  );
}
