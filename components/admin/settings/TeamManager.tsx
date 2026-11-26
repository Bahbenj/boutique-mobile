"use client";

import { useState, useTransition } from "react";
import { addTeamMember, removeTeamMember, setTeamRole } from "@/app/admin/(panel)/parametres/team-actions";
import type { TeamMember } from "@/lib/admin/team";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { IconCopy, IconWhatsApp } from "@/components/ui/icons";
import { ConfirmDialog, FormSection } from "../ui";

const roles = {
  manager: { label: "Gérant", help: "Tout gérer, sauf l'équipe." },
  seller: { label: "Vendeur", help: "Commandes, réparations et stock seulement." },
} as const;
type Role = keyof typeof roles;

const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Bamako" });

/** Équipe (propriétaire seul) : accès des employés, rôle, retrait. */
export function TeamManager({ members }: { members: TeamMember[] }) {
  const toast = useUI((s) => s.showToast);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("seller");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string | null; role: Role } | null>(null);
  const [toRemove, setToRemove] = useState<TeamMember | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const res = await addTeamMember({ email, role });
      if (!res.ok) {
        setError(res.fields?.email ?? res.error);
        return;
      }
      setError(null);
      setCreated({ email: email.trim().toLowerCase(), password: res.data.password, role });
      setEmail("");
      toast({ title: "Accès créé", text: `${email.trim()} · ${roles[role].label}` });
    });

  const changeRole = (m: TeamMember, next: Role) =>
    start(async () => {
      const res = await setTeamRole(m.userId, next);
      toast(res.ok ? { title: "Rôle changé", text: `${m.email} : ${roles[next].label}` } : { title: "Pas enregistré", text: res.error, tone: "error" });
    });

  const loginUrl = typeof window === "undefined" ? "/admin/login" : `${window.location.origin}/admin/login`;
  const shareText = created
    ? `Bonjour, voici ton accès à l'administration Mobile Empire (${roles[created.role].label}).\nAdresse : ${loginUrl}\nE-mail : ${created.email}\nMot de passe provisoire : ${created.password}\nChange-le dans « Mon compte » après ta première connexion.`
    : "";

  return (
    <FormSection title="Équipe" description="Vous seul voyez cette partie. Chaque employé a son propre accès : vous savez qui a fait quoi.">
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
              <p className="truncate font-semibold">
                {m.email}
                {m.isMe && <span className="text-muted"> (vous)</span>}
              </p>
              <p className="text-xs text-muted">{m.lastSignIn ? `Dernière connexion le ${day.format(new Date(m.lastSignIn))}` : "Jamais connecté"}</p>
            </div>
            {m.role === "owner" ? (
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-on-gold">Propriétaire</span>
            ) : (
              <div className="flex items-center gap-1">
                <div role="radiogroup" aria-label={`Rôle de ${m.email}`} className="flex rounded-full bg-raised p-1 ring-1 ring-line">
                  {(Object.keys(roles) as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="radio"
                      aria-checked={m.role === r}
                      disabled={pending}
                      onClick={() => m.role !== r && changeRole(m, r)}
                      className={cn("h-9 rounded-full px-3 text-sm font-semibold", m.role === r ? "bg-accent text-on-accent" : "text-muted hover:text-fg")}
                    >
                      {roles[r].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setToRemove(m)}
                  className="h-11 rounded-full px-3 text-sm font-semibold text-danger hover:bg-danger-soft"
                >
                  Retirer
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-raised/50 p-4 ring-1 ring-line">
        <h3 className="font-bold">Ajouter un employé</h3>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3">
          <Field
            label="Son adresse e-mail"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            error={error ?? undefined}
          />
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-sm font-semibold">Rôle</legend>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {(Object.keys(roles) as Role[]).map((r) => (
                <label key={r} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1", role === r ? "bg-accent-soft ring-accent" : "bg-surface ring-line")}>
                  <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="mt-1 size-5 accent-[var(--accent)]" />
                  <span>
                    <span className="block font-semibold">{roles[r].label}</span>
                    <span className="text-sm text-muted">{roles[r].help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button onClick={add} disabled={pending || !email.trim()} className="max-sm:w-full sm:justify-self-start">
            {pending ? "Création…" : "Créer son accès"}
          </Button>
        </div>
      </div>

      {created && (
        <div role="status" className="mt-4 rounded-2xl bg-accent-soft p-4 ring-1 ring-accent/30">
          <p className="font-bold">Accès prêt pour {created.email}</p>
          {created.password ? (
            <>
              <p className="mt-1 text-sm">
                Mot de passe provisoire (affiché une seule fois) :{" "}
                <strong className="font-mono text-base tracking-wider select-all">{created.password}</strong>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className={buttonClasses("whatsapp", "md", "max-sm:w-full")}>
                  <IconWhatsApp size={18} />
                  Envoyer par WhatsApp
                </a>
                <Button
                  variant="light"
                  className="max-sm:w-full"
                  onClick={() => navigator.clipboard?.writeText(shareText).then(() => toast({ title: "Copié", text: "Collez le message où vous voulez." }))}
                >
                  <IconCopy size={16} />
                  Copier
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm">Ce compte existait déjà : il garde son mot de passe et a maintenant accès à l&apos;administration.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Retirer cet accès ?"
        confirmLabel="Retirer"
        pendingLabel="Retrait…"
        pending={pending}
        onClose={() => setToRemove(null)}
        onConfirm={() =>
          start(async () => {
            if (!toRemove) return;
            const res = await removeTeamMember(toRemove.userId);
            toast(res.ok ? { title: "Accès retiré", text: toRemove.email } : { title: "Pas enregistré", text: res.error, tone: "error" });
            setToRemove(null);
          })
        }
      >
        <p>
          <strong className="text-fg">{toRemove?.email}</strong> ne pourra plus ouvrir l&apos;administration. Son historique (commandes traitées, stock) reste visible.
        </p>
      </ConfirmDialog>
    </FormSection>
  );
}
