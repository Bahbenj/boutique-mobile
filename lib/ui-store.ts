"use client";

import { create } from "zustand";

/** État d'interface global (non persisté) : modales et tiroirs. */
type UIState = {
  authOpen: boolean;
  authMode: "login" | "signup";
  cartOpen: boolean;
  heroActive: boolean; // hero épinglé à l'écran (masque le bouton WhatsApp flottant)
  setHeroActive: (v: boolean) => void;
  openAuth: (mode?: "login" | "signup") => void;
  closeAuth: () => void;
  setAuthMode: (mode: "login" | "signup") => void;
  openCart: () => void;
  closeCart: () => void;
};

export const useUI = create<UIState>((set) => ({
  authOpen: false,
  authMode: "login",
  cartOpen: false,
  heroActive: false,
  setHeroActive: (heroActive) => set({ heroActive }),
  openAuth: (mode = "login") => set({ authOpen: true, authMode: mode }),
  closeAuth: () => set({ authOpen: false }),
  setAuthMode: (authMode) => set({ authMode }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
}));
