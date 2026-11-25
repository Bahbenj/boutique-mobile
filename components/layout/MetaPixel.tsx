"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { initPixel, pixelEnabled, track } from "@/lib/meta-pixel";

/**
 * Charge le Meta Pixel en différé et envoie un PageView à chaque page.
 * Rien n'est rendu ni chargé si NEXT_PUBLIC_META_PIXEL_ID est vide.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pixelEnabled || lastPath.current === pathname) return;
    lastPath.current = pathname;
    initPixel();
    track("PageView");
  }, [pathname]);

  if (!pixelEnabled) return null;
  // lazyOnload : téléchargé quand le navigateur est inactif, après le chargement de la page
  return <Script id="meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="lazyOnload" />;
}

/** ViewContent d'une fiche produit (à placer dans la page produit). */
export function TrackViewContent({ params }: { params: Record<string, unknown> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track("ViewContent", params);
  }, [params]);
  return null;
}
