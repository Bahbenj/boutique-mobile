"use client";

import { create } from "zustand";

export type Toast = {
  id: number;
  title: string;
  text?: string;
  image?: string;
  /** Erreur : icône et couleur distinctes du succès. */
  tone?: "success" | "error";
  /** Bouton d'action (ex. « Annuler » juste après une modification). */
  action?: { label: string; onClick: () => void };
};

/** État d'interface global (non persisté) : modales, tiroirs, notifications. */
type UIState = {
  cartOpen: boolean;
  heroActive: boolean; // hero épinglé à l'écran (masque les actions flottantes)
  /** Incrémenté à chaque ajout : sert de `key` pour rejouer l'animation du compteur. */
  cartBump: number;
  toast: Toast | null;
  setHeroActive: (v: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  bumpCart: () => void;
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: () => void;
};

export const useUI = create<UIState>((set) => ({
  cartOpen: false,
  heroActive: false,
  cartBump: 0,
  toast: null,
  setHeroActive: (heroActive) => set({ heroActive }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  bumpCart: () => set((s) => ({ cartBump: s.cartBump + 1 })),
  showToast: (toast) => set({ toast: { ...toast, id: Date.now() } }),
  dismissToast: () => set({ toast: null }),
}));
