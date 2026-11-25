import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { AccountMenu } from "@/components/admin/AccountMenu";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPageSkeleton } from "@/components/admin/AdminPage";
import { Toaster } from "@/components/layout/Toaster";

/**
 * Coque de l'admin. Le contenu n'est rendu qu'après requireAdmin() (sous
 * <Suspense> : la session est lue à la requête, Cache Components oblige).
 */
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-admin-shell className="flex min-h-svh flex-1">
      <AdminNav
        account={
          <Suspense fallback={null}>
            <AccountMenu />
          </Suspense>
        }
      />
      <div className="min-w-0 flex-1">
        {/* Barre du haut (mobile) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur-xl lg:hidden">
          <span aria-hidden="true" className="hex grid h-9 w-8 place-items-center bg-gradient-to-b from-gold-hover to-gold text-on-gold text-[0.7rem] font-extrabold">
            {siteConfig.shortName}
          </span>
          <span className="flex-1 truncate font-extrabold tracking-tight">Administration</span>
          <Suspense fallback={null}>
            <AccountMenu compact />
          </Suspense>
        </header>
        <main id="contenu" className="px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          <Suspense fallback={<AdminPageSkeleton />}>
            <AdminGate>{children}</AdminGate>
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
