"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  completeProfile,
  requestPasswordReset,
  resendConfirmation,
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUp,
  updatePassword,
  type AuthState,
} from "@/app/(site)/compte/actions";
import { phoneHint, phonePlaceholder } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { IconCheck, IconMail, IconSpinner } from "@/components/ui/icons";

const initial: AuthState = {};

/** « G » de Google en monochrome (charte du site : ni rouge ni jaune). */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.33Z" />
      <path d="M12 22c2.7 0 4.98-.9 6.64-2.42l-3.24-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z" opacity=".75" />
      <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96L6.4 13.9Z" opacity=".55" />
      <path d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" opacity=".9" />
    </svg>
  );
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-fg text-[0.9375rem] font-semibold text-canvas shadow-soft transition hover:brightness-95 disabled:opacity-70"
    >
      {pending ? <IconSpinner size={18} /> : <GoogleMark />}
      Continuer avec Google
    </button>
  );
}

export function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next} />
      <GoogleSubmit />
    </form>
  );
}

export function OrDivider() {
  return (
    <p className="my-5 flex items-center gap-3 text-sm text-muted" role="separator">
      <span className="h-px flex-1 bg-line" />
      ou
      <span className="h-px flex-1 bg-line" />
    </p>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "ok"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-2xl p-3 text-sm font-medium", tone === "error" ? "bg-danger-soft text-danger" : "bg-accent-soft text-fg ring-1 ring-accent/30")}
    >
      {tone === "ok" && <IconCheck size={16} className="me-1.5 inline text-accent" />}
      {children}
    </p>
  );
}

function Submit({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending || undefined}>
      {pending && <IconSpinner size={18} />}
      {pending ? pendingLabel : children}
    </Button>
  );
}

function ResendButton({ email, next }: { email: string; next: string }) {
  const [state, action] = useActionState(resendConfirmation, initial);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <ResendSubmit />
      {state.notice && <p className="mt-2 text-sm text-muted">{state.notice}</p>}
      {state.error && <p className="mt-2 text-sm font-medium text-danger">{state.error}</p>}
    </form>
  );
}
function ResendSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-10 text-sm font-semibold text-accent underline-offset-4 hover:underline">
      {pending ? "Envoi…" : "Renvoyer l'e-mail de confirmation"}
    </button>
  );
}

function PasswordField({ name = "password", label, autoComplete, error }: { name?: string; label: string; autoComplete: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Field label={label} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required error={error} />
      <button type="button" onClick={() => setShow((s) => !s)} className="mt-1 min-h-9 text-xs font-semibold text-muted hover:text-fg">
        {show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      </button>
    </div>
  );
}

// --- Connexion -----------------------------------------------------------------------------------

export function LoginPanel({ next }: { next: string }) {
  const [tab, setTab] = useState<"password" | "magic">("password");
  return (
    <div>
      <div role="tablist" aria-label="Méthode de connexion" className="mb-4 flex gap-1 rounded-full bg-raised p-1 ring-1 ring-line">
        {(
          [
            ["password", "Mot de passe"],
            ["magic", "Lien par e-mail"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cn("h-10 flex-1 rounded-full text-sm font-semibold", tab === k ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "password" ? <PasswordLogin next={next} /> : <MagicLinkForm next={next} />}
    </div>
  );
}

function PasswordLogin({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithPassword, initial);
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} required />
      <PasswordField label="Mot de passe" autoComplete="current-password" />
      {state.error && (
        <div>
          <Alert>{state.error}</Alert>
          {state.unconfirmed && state.email && <ResendButton email={state.email} next={next} />}
        </div>
      )}
      <Submit pendingLabel="Connexion…">Se connecter</Submit>
      <Link href={`/compte/mot-de-passe-oublie?next=${encodeURIComponent(next)}`} className="justify-self-center text-sm font-semibold text-accent underline-offset-4 hover:underline">
        Mot de passe oublié&nbsp;?
      </Link>
    </form>
  );
}

function MagicLinkForm({ next }: { next: string }) {
  const [state, action] = useActionState(sendMagicLink, initial);
  if (state.notice)
    return (
      <div className="space-y-3">
        <Alert tone="ok">{state.notice}</Alert>
        <p className="text-sm text-muted">Pas reçu ? Vérifiez les courriers indésirables, ou réessayez dans une minute.</p>
      </div>
    );
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-muted">Pas de mot de passe à retenir : nous vous envoyons un lien de connexion. S&apos;il n&apos;y a pas encore de compte, il est créé.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} required />
      {state.error && <Alert>{state.error}</Alert>}
      <Submit pendingLabel="Envoi…">
        <IconMail size={18} />
        Recevoir le lien
      </Submit>
    </form>
  );
}

// --- Inscription ------------------------------------------------------------------------------------

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, initial);
  const f = state.fields ?? {};
  if (state.notice)
    return (
      <div className="space-y-3">
        <Alert tone="ok">{state.notice}</Alert>
        {state.email && <ResendButton email={state.email} next={next} />}
      </div>
    );
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Nom complet" name="full_name" autoComplete="name" required error={f.full_name} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} required error={f.email} />
      <Field label="Téléphone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={phonePlaceholder} hint={phoneHint} required error={f.phone} />
      <PasswordField label="Mot de passe (8 caractères au moins)" autoComplete="new-password" error={f.password} />
      <CgvCheckbox error={f.cgv} />
      {state.error && <Alert>{state.error}</Alert>}
      <Submit pendingLabel="Création…">Créer mon compte</Submit>
    </form>
  );
}

function CgvCheckbox({ error }: { error?: string }) {
  return (
    <div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="cgv" className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]" aria-invalid={error ? true : undefined} />
        <span>
          J&apos;accepte les{" "}
          <Link href="/cgv" target="_blank" className="font-semibold text-accent underline-offset-4 hover:underline">
            conditions générales de vente
          </Link>{" "}
          et j&apos;ai lu la{" "}
          <Link href="/confidentialite" target="_blank" className="font-semibold text-accent underline-offset-4 hover:underline">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>
      {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

// --- Mot de passe oublié / nouveau mot de passe ----------------------------------------------------

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, initial);
  if (state.notice) return <Alert tone="ok">{state.notice}</Alert>;
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <Field label="E-mail de votre compte" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} required />
      {state.error && <Alert>{state.error}</Alert>}
      <Submit pendingLabel="Envoi…">Recevoir un lien</Submit>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, initial);
  const f = state.fields ?? {};
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PasswordField label="Nouveau mot de passe" autoComplete="new-password" error={f.password} />
      <PasswordField name="confirm" label="Répétez-le" autoComplete="new-password" error={f.confirm} />
      {state.error && !f.password && !f.confirm && <Alert>{state.error}</Alert>}
      <Submit pendingLabel="Enregistrement…">Enregistrer le mot de passe</Submit>
    </form>
  );
}

// --- Profil à compléter -----------------------------------------------------------------------------

export function CompleteProfileForm({ next, fullName, phone, needsCgv }: { next: string; fullName: string; phone: string; needsCgv: boolean }) {
  const [state, action] = useActionState(completeProfile, initial);
  const f = state.fields ?? {};
  return (
    <form action={action} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="needs_cgv" value={needsCgv ? "1" : "0"} />
      <Field label="Nom complet" name="full_name" autoComplete="name" defaultValue={fullName} required error={f.full_name} />
      <Field
        label="Téléphone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={phonePlaceholder}
        hint="Pour vous appeler ou vous écrire sur WhatsApp au sujet de vos commandes."
        defaultValue={phone}
        required
        error={f.phone}
      />
      {needsCgv && <CgvCheckbox error={f.cgv} />}
      {state.error && <Alert>{state.error}</Alert>}
      <Submit pendingLabel="Enregistrement…">Continuer</Submit>
    </form>
  );
}
