import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategory, getCategoryChips, getProducts } from "@/lib/catalog";
import { ShopView } from "@/components/shop/ShopView";

/** Rayons connus au build ; ceux créés ensuite dans l'admin sont rendus à la demande. */
export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ categorie: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/boutique/[categorie]">): Promise<Metadata> {
  const category = await getCategory((await params).categorie);
  if (!category) return {};
  return {
    title: category.title,
    description: category.description,
    alternates: { canonical: `/boutique/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/boutique/[categorie]">) {
  const category = await getCategory((await params).categorie);
  if (!category) notFound();
  const [products, chips] = await Promise.all([getProducts(category.slug), getCategoryChips()]);

  return (
    <ShopView
      title={category.title}
      lead={category.description}
      products={products}
      chips={chips}
      active={category.slug}
    />
  );
}
