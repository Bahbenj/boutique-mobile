"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Ligne de panier : autonome (snapshot du prix au moment de l'ajout). */
export type CartItem = {
  key: string; // productId + variante
  productId: string;
  slug: string;
  name: string;
  variant?: string; // « Noir · 128 Go »
  price: number;
  image: string;
  qty: number;
  maxQty: number;
  /** Produit à livraison offerte : la commande entière ne paie pas la livraison. */
  freeDelivery?: boolean;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.key === item.key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === item.key ? { ...i, qty: Math.min(i.qty + qty, i.maxQty) } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, qty: Math.min(qty, item.maxQty) }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.key === key ? { ...i, qty: Math.min(Math.max(qty, 0), i.maxQty) } : i))
            .filter((i) => i.qty > 0),
        })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-v2" }, // v2 : nouveau catalogue, les paniers des anciens exemples sont oubliés
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = (items: CartItem[]) => items.reduce((n, i) => n + i.qty * i.price, 0);
