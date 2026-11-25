import type { ComponentType } from "react";
import { IconBox, IconFlash, IconGrid, IconReceipt, IconSettings, IconSliders, IconStar, IconTag, IconWrench } from "@/components/ui/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  short: string;
  Icon: ComponentType<{ size?: number }>;
  /** Onglet de la barre du bas sur mobile ; sinon dans le menu « Plus » (4 onglets au plus). */
  primary?: boolean;
};

/** Sections de l'admin : barre latérale (desktop) et barre du bas (mobile). */
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", Icon: IconGrid, primary: true },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes", Icon: IconReceipt, primary: true },
  { href: "/admin/reparations", label: "Réparations", short: "Réparations", Icon: IconWrench, primary: true },
  { href: "/admin/produits", label: "Produits", short: "Produits", Icon: IconBox, primary: true },
  { href: "/admin/categories", label: "Catégories", short: "Rayons", Icon: IconTag },
  { href: "/admin/promotions", label: "Promotions", short: "Promos", Icon: IconFlash },
  { href: "/admin/stock", label: "Stock", short: "Stock", Icon: IconSliders },
  { href: "/admin/avis", label: "Avis clients", short: "Avis", Icon: IconStar },
  { href: "/admin/parametres", label: "Paramètres", short: "Réglages", Icon: IconSettings },
];
