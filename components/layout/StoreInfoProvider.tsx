"use client";

import { createContext, useContext, type ReactNode } from "react";
import { fallbackStoreInfo, type StoreInfo } from "@/lib/store-info";
import { whatsappLink } from "@/lib/whatsapp";

const StoreInfoContext = createContext<StoreInfo>(fallbackStoreInfo());

/** Infos de la boutique réglées dans l'admin, pour les composants client du site. */
export function StoreInfoProvider({ value, children }: { value: StoreInfo; children: ReactNode }) {
  return <StoreInfoContext.Provider value={value}>{children}</StoreInfoContext.Provider>;
}

export const useStoreInfo = () => useContext(StoreInfoContext);

/** Lien WhatsApp vers le numéro de la boutique (réglé dans l'admin). */
export function useWhatsappLink() {
  const { whatsapp } = useStoreInfo();
  return (message?: string) => whatsappLink(message, whatsapp);
}
