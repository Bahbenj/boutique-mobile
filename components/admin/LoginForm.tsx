"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { signIn, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

/** Formulaire de connexion admin (Server Action + état d'erreur). */
export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

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
        autoFocus
      />
      <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
      {state.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
