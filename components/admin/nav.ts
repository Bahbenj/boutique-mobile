import type { ComponentType } from "react";
import { IconBox, IconGrid, IconReceipt, IconSettings, IconTag } from "@/components/ui/icons";

export type AdminNavItem = { href: string; label: string; short: string; Icon: ComponentType<{ size?: number }> };

/** Sections de l'admin : barre latérale (desktop) et barre du bas (mobile). */
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", Icon: IconGrid },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes", Icon: IconReceipt },
  { href: "/admin/produits", label: "Produits", short: "Produits", Icon: IconBox },
  { href: "/admin/categories", label: "Catégories", short: "Catégories", Icon: IconTag },
  { href: "/admin/parametres", label: "Paramètres", short: "Réglages", Icon: IconSettings },
];
