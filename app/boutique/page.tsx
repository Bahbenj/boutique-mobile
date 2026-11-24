import type { Metadata } from "next";
import { t } from "@/i18n";
import { getCategoryChips, getProducts } from "@/lib/catalog";
import { ShopView } from "@/components/shop/ShopView";

export const metadata: Metadata = {
  title: t.shop.title,
  description: t.shop.lead,
  alternates: { canonical: "/boutique" },
};

export default async function ShopPage() {
  const [products, chips] = await Promise.all([getProducts(), getCategoryChips()]);
  return <ShopView title={t.shop.title} lead={t.shop.lead} products={products} chips={chips} />;
}
