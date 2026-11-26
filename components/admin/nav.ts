import type { ComponentType } from "react";
import { IconBox, IconFlash, IconGrid, IconHelp, IconHistory, IconReceipt, IconSettings, IconSliders, IconStar, IconTag, IconUser, IconWrench } from "@/components/ui/icons";

export type AdminNavItem = {
  href: string;
  label: string;
  short: string;
  Icon: ComponentType<{ size?: number }>;
  /** Onglet de la barre du bas sur mobile ; sinon dans le menu « Plus » (4 onglets au plus). */
  primary?: boolean;
  /** Toute l'équipe, vendeurs compris (sinon : propriétaire et gérant). */
  staff?: boolean;
  /** Propriétaire seul. */
  owner?: boolean;
};

export type NavRole = "owner" | "manager" | "seller";

/** Sections visibles pour ce rôle (null : rôle pas encore lu, tout sauf le réservé au propriétaire). */
export const navFor = (role: NavRole | null) => adminNav.filter((i) => (i.owner ? role === "owner" : role !== "seller" || i.staff));

/** Ajout d'un produit : propriétaire et gérant (bouton toujours visible dans la navigation). */
export const canAddProduct = (role: NavRole | null) => role !== "seller";

/** Sections de l'admin : barre latérale (desktop) et barre du bas (mobile). */
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", Icon: IconGrid, primary: true },
  { href: "/admin/commandes", label: "Commandes", short: "Commandes", Icon: IconReceipt, primary: true, staff: true },
  { href: "/admin/produits", label: "Produits", short: "Produits", Icon: IconBox, primary: true },
  { href: "/admin/reparations", label: "Réparations", short: "Réparations", Icon: IconWrench, primary: true, staff: true },
  { href: "/admin/categories", label: "Catégories", short: "Rayons", Icon: IconTag },
  { href: "/admin/promotions", label: "Promotions", short: "Promos", Icon: IconFlash },
  { href: "/admin/stock", label: "Stock", short: "Stock", Icon: IconSliders, staff: true },
  { href: "/admin/clients", label: "Clients", short: "Clients", Icon: IconUser },
  { href: "/admin/avis", label: "Avis clients", short: "Avis", Icon: IconStar },
  { href: "/admin/parametres", label: "Paramètres", short: "Réglages", Icon: IconSettings },
  { href: "/admin/journal", label: "Journal d'activité", short: "Journal", Icon: IconHistory, owner: true },
  { href: "/admin/aide", label: "Guide rapide", short: "Aide", Icon: IconHelp, staff: true },
];
