import { siteConfig } from "@/config/site";

/**
 * Meta Pixel (Facebook / Instagram Ads).
 * Identifiant dans NEXT_PUBLIC_META_PIXEL_ID : vide ou invalide = pixel
 * désactivé, aucun script chargé, aucun appel réseau.
 *
 * Le script de Meta (fbevents.js) est chargé en différé, une fois la page
 * devenue inactive (components/layout/MetaPixel.tsx, strategy="lazyOnload") :
 * il ne ralentit ni l'affichage ni l'interactivité. En attendant, les
 * événements sont mis en file (même mécanisme que l'extrait officiel) puis
 * envoyés à son arrivée : aucun n'est perdu.
 *
 * Événements envoyés :
 *   PageView          chaque page (y compris navigations internes)
 *   ViewContent       fiche produit
 *   AddToCart         ajout au panier
 *   InitiateCheckout  arrivée sur la page Commande avec un panier
 *   Purchase + Lead   commande validée (envoyée sur WhatsApp)
 */

export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
export const pixelEnabled = /^\d{5,20}$/.test(META_PIXEL_ID);

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    __metaPixelReady?: boolean;
  }
}

/** File d'attente « fbq » de l'extrait officiel, sans charger le script. */
function ensureQueue(): Fbq {
  if (window.fbq) return window.fbq;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  return n;
}

/** Initialise le pixel une seule fois par chargement de page. */
export function initPixel() {
  if (!pixelEnabled || typeof window === "undefined") return;
  const fbq = ensureQueue();
  if (window.__metaPixelReady) return;
  window.__metaPixelReady = true;
  fbq("init", META_PIXEL_ID);
}

type StandardEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Lead";

/** Envoie un événement standard (sans effet si le pixel est désactivé). */
export function track(event: StandardEvent, params?: Record<string, unknown>, options?: { eventID?: string }) {
  if (!pixelEnabled || typeof window === "undefined") return;
  initPixel();
  const fbq = ensureQueue();
  if (options) fbq("track", event, params ?? {}, options);
  else if (params) fbq("track", event, params);
  else fbq("track", event);
}

/** Paramètres communs aux événements e-commerce (montants en FCFA). */
export const money = (value: number) => ({ value: Math.round(value), currency: siteConfig.currency });

/** Identifiant d'événement (dédoublonnage côté Meta si l'API Conversions est ajoutée plus tard). */
export const newEventId = () => `cmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
