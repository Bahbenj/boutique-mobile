"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/admin/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const titles: Record<NonNullable<LoginState["kind"]>, string> = {
  credentials: "Identifiants incorrects",
  forbidden: "Compte non autorisé",
  config: "Erreur de configuration",
  network: "Erreur de connexion",
  rate_limit: "Trop de tentatives",
  unconfirmed: "Compte non confirmé",
};

/** Formulaire de connexion admin (Server Action + état d'erreur détaillé). */
export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  // Erreur « serveur » (config, réseau) : le formulaire n'y est pour rien, ton différent
  const serverSide = state.kind === "config" || state.kind === "network";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.email}
        aria-invalid={state.kind === "credentials" || undefined}
        autoFocus
      />
      <Field
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        aria-invalid={state.kind === "credentials" || undefined}
      />
      {state.error && state.kind && (
        <div
          role="alert"
          data-kind={state.kind}
          className={cn("rounded-2xl px-4 py-3 text-sm", serverSide ? "bg-accent-soft text-ink" : "bg-red-50 text-red-800")}
        >
          <p className="font-bold">{titles[state.kind]}</p>
          <p className="mt-0.5">{state.error}</p>
          {state.hint && <p className="mt-1 opacity-80">{state.hint}</p>}
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
