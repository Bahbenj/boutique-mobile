import { signOut } from "@/app/admin/actions";
import { getAdmin } from "@/lib/auth";
import { IconLogout } from "@/components/ui/icons";

/** E-mail de l'admin connecté + déconnexion. Lit la session : à placer sous <Suspense>. */
export async function AccountMenu({ compact = false }: { compact?: boolean }) {
  const admin = await getAdmin();
  return (
    <form action={signOut} className={compact ? "" : "px-1"}>
      {!compact && admin?.email && <p className="truncate px-3 pb-1 text-xs text-muted">{admin.email}</p>}
      <button
        type="submit"
        className={
          compact
            ? "grid size-10 place-items-center rounded-full bg-white text-ink shadow-soft"
            : "flex h-10 w-full items-center gap-3 rounded-full px-3 text-sm font-medium text-ink/70 hover:bg-ink/5 hover:text-ink"
        }
        aria-label={compact ? "Se déconnecter" : undefined}
      >
        <IconLogout size={17} />
        {!compact && "Se déconnecter"}
      </button>
    </form>
  );
}
