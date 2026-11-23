"use client";

import { type FormEvent, useState } from "react";
import { t } from "@/i18n";
import { useUI } from "@/lib/ui-store";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";

/**
 * Modale connexion / inscription. L'UI est prête ; l'authentification sera
 * branchée sur le back-end (Supabase Auth par ex.) dans onSubmit.
 */
export function AuthModal() {
  const { authOpen, authMode, closeAuth, setAuthMode } = useUI();
  const [notice, setNotice] = useState(false);
  const isLogin = authMode === "login";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNotice(true); // TODO back-end : appel d'authentification
  };

  const close = () => {
    setNotice(false);
    closeAuth();
  };

  return (
    <Modal
      open={authOpen}
      onClose={close}
      title={isLogin ? t.auth.loginTitle : t.auth.signupTitle}
      description={isLogin ? t.auth.loginLead : t.auth.signupLead}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {!isLogin && <Field label={t.auth.name} name="name" autoComplete="name" required data-autofocus />}
        <Field
          label={t.auth.phone}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+216 XX XXX XXX"
          required
          data-autofocus={isLogin ? true : undefined}
        />
        <Field
          label={t.auth.password}
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />

        {notice && (
          <p role="status" className="rounded-2xl bg-accent-soft px-4 py-3 text-sm text-ink">
            {t.auth.soon}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full">
          {isLogin ? t.auth.login : t.auth.signup}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? t.auth.switchToSignup : t.auth.switchToLogin}{" "}
        <button
          type="button"
          onClick={() => {
            setNotice(false);
            setAuthMode(isLogin ? "signup" : "login");
          }}
          className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
        >
          {isLogin ? t.auth.signupLink : t.auth.loginLink}
        </button>
      </p>
    </Modal>
  );
}
