import type { ComponentType } from "react";
import { IconBox, IconFlash, IconGrid, IconReceipt, IconSettings, IconSliders, IconStar, IconTag, IconUser, IconWrench } from "@/components/ui/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  short: string;
  Icon: ComponentType<{ size?: number }>;
  /** Onglet de la barre du bas sur mobile ; sinon dans le menu « Plus » (4 onglets au plus). */
  primary?: boolean;
  /** Toute l'équipe, vendeurs compris (sinon : propriétaire et gérant). */
  staff?: boolean;
};

export type NavRole = "owner" | "manager" | "seller";

/** Sections visibles pour ce rôle (null : rôle pas encore lu, tout est montré). */
export const navFor = (role: NavRole | null) => adminNav.filter((i) => role !== "seller" || i.staff);

/** Sections de l'admin : barre latérale (desktop) et barre du bas (mobile). */
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", Icon: IconGrid, primary: true },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes", Icon: IconReceipt, primary: true, staff: true },
  { href: "/admin/reparations", label: "Réparations", short: "Réparations", Icon: IconWrench, primary: true, staff: true },
  { href: "/admin/produits", label: "Produits", short: "Produits", Icon: IconBox, primary: true },
  { href: "/admin/categories", label: "Catégories", short: "Rayons", Icon: IconTag },
  { href: "/admin/promotions", label: "Promotions", short: "Promos", Icon: IconFlash },
  { href: "/admin/stock", label: "Stock", short: "Stock", Icon: IconSliders, staff: true },
  { href: "/admin/clients", label: "Clients", short: "Clients", Icon: IconUser },
  { href: "/admin/avis", label: "Avis clients", short: "Avis", Icon: IconStar },
  { href: "/admin/parametres", label: "Paramètres", short: "Réglages", Icon: IconSettings },
];
