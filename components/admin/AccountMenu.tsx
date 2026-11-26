import { signOut } from "@/app/admin/actions";
import Link from "next/link";
import { getStaff, roleLabels } from "@/lib/auth";
import { IconLogout, IconUser } from "@/components/ui/icons";

/** E-mail de l'admin connecté + déconnexion. Lit la session : à placer sous <Suspense>. */
export async function AccountMenu({ compact = false }: { compact?: boolean }) {
  const admin = await getStaff();
  return (
    <form action={signOut} className={compact ? "flex items-center gap-2" : "px-1"}>
      {compact && (
        <Link href="/admin/compte" aria-label="Mon compte" className="grid size-10 place-items-center rounded-full bg-surface text-fg shadow-soft">
          <IconUser size={17} />
        </Link>
      )}
      {!compact && admin?.email && (
        <p className="truncate px-3 pb-1 text-xs text-muted">
          {admin.email} · {roleLabels[admin.role]}
        </p>
      )}
      {!compact && (
        <Link href="/admin/compte" className="flex h-10 w-full items-center gap-3 rounded-full px-3 text-sm font-medium text-fg/70 hover:bg-fg/5 hover:text-fg">
          <IconUser size={17} />
          Mon compte
        </Link>
      )}
      <button
        type="submit"
        className={
          compact
            ? "grid size-10 place-items-center rounded-full bg-surface text-fg shadow-soft"
            : "flex h-10 w-full items-center gap-3 rounded-full px-3 text-sm font-medium text-fg/70 hover:bg-fg/5 hover:text-fg"
        }
        aria-label={compact ? "Se déconnecter" : undefined}
      >
        <IconLogout size={17} />
        {!compact && "Se déconnecter"}
      </button>
    </form>
  );
}
