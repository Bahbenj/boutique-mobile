import type { Metadata } from "next";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "@/components/admin/LoginForm";
import { IconLock } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Connexion" };

export default function AdminLoginPage() {
  return (
    <main id="contenu" className="grid flex-1 place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 font-extrabold tracking-tight">
          <span aria-hidden="true" className="hex grid h-9 w-8 place-items-center bg-gradient-to-b from-gold-hover to-gold text-on-gold text-[0.75rem]">
            {siteConfig.shortName}
          </span>
          {siteConfig.name}
        </div>
        <div className="rounded-card-lg bg-surface p-6 shadow-soft sm:p-8">
          <span className="grid size-11 place-items-center rounded-full bg-accent-soft">
            <IconLock size={20} />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold">Administration</h1>
          <p className="mt-1.5 text-sm text-muted">Connectez-vous pour gérer la boutique.</p>
          <div className="mt-6">
            {isSupabaseConfigured ? (
              <Suspense fallback={<div className="skeleton h-56 rounded-2xl" aria-hidden="true" />}>
                <LoginForm />
              </Suspense>
            ) : (
              <div role="status" className="rounded-2xl bg-accent-soft p-4 text-sm leading-relaxed">
                <p className="font-bold">Supabase n&apos;est pas encore configuré.</p>
                <p className="mt-1">
                  Copiez <code className="font-semibold">.env.example</code> en <code className="font-semibold">.env.local</code>,
                  renseignez l&apos;URL et les clés du projet, puis redémarrez le serveur.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
