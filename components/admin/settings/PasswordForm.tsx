"use client";

import { useState, useTransition } from "react";
import { changeMyPassword } from "@/app/admin/(panel)/parametres/team-actions";
import { useUI } from "@/lib/ui-store";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormSection } from "../ui";

/** Changement de son propre mot de passe (après un mot de passe provisoire, par exemple). */
export function PasswordForm() {
  const toast = useUI((s) => s.showToast);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    if (password.length < 8) return setError("8 caractères au moins.");
    if (password !== confirm) return setError("Les deux saisies sont différentes.");
    start(async () => {
      const res = await changeMyPassword(password);
      if (!res.ok) return setError(res.error);
      setError(null);
      setPassword("");
      setConfirm("");
      toast({ title: "Mot de passe changé", text: "Utilisez-le à votre prochaine connexion." });
    });
  };

  return (
    <FormSection title="Mot de passe" description="Choisissez un mot de passe que vous seul connaissez (8 caractères au moins).">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2"
      >
        <Field label="Nouveau mot de passe" type={show ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field
          label="Répétez-le"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={error ?? undefined}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          Afficher les caractères
        </label>
        <Button type="submit" disabled={pending || !password} className="max-sm:w-full sm:justify-self-start">
          {pending ? "Enregistrement…" : "Changer mon mot de passe"}
        </Button>
      </form>
    </FormSection>
  );
}
