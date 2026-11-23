import { fr, type Dictionary } from "./fr";

/** Langues prévues. « ar » s'affichera en RTL (dir="rtl"). */
export const locales = {
  fr: { dict: fr, dir: "ltr", htmlLang: "fr" },
} as const satisfies Record<string, { dict: Dictionary; dir: "ltr" | "rtl"; htmlLang: string }>;

export type Locale = keyof typeof locales;
export const defaultLocale: Locale = "fr";

/** Pour l'instant une seule langue : `t` pointe sur le français. */
export const t: Dictionary = locales[defaultLocale].dict;
export const dir = locales[defaultLocale].dir;
export const htmlLang = locales[defaultLocale].htmlLang;
