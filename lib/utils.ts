import { siteConfig } from "@/config/site";

/** Concatène des classes en ignorant les valeurs falsy. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const priceFormatter = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/** 1299 → « 1 299 DT » */
export function formatPrice(value: number) {
  return priceFormatter.format(value).replace("TND", "DT");
}
