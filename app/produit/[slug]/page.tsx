import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { products } from "@/data/products";
import { t } from "@/i18n";
import { getCategory, getProductBySlug } from "@/lib/catalog";
import { Container } from "@/components/ui/Container";
import { IconCash, IconShield, IconTruck } from "@/components/ui/icons";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";

export function generateStaticParams() {
  return products.filter((p) => p.isActive).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produit/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: `${product.name}${product.condition !== "neuf" ? " (occasion)" : ""}`,
    description: product.description,
    alternates: { canonical: `/produit/${product.slug}` },
    openGraph: { images: [{ url: product.images[0].src, alt: product.images[0].alt }] },
  };
}

export default async function ProductPage({ params }: PageProps<"/produit/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const category = await getCategory(product.category);
  const warranty = product.condition === "neuf" ? siteConfig.warrantyMonths.new : siteConfig.warrantyMonths.used;

  const perks = [
    { Icon: IconCash, text: t.promises.cod.title },
    { Icon: IconTruck, text: t.promises.delivery.text },
    { Icon: IconShield, text: t.product.warranty(warranty) },
  ];

  return (
    <Container className="pt-24 pb-20 sm:pt-32 sm:pb-28">
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/boutique" className="hover:text-ink">
              {t.product.back}
            </Link>
          </li>
          {category && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <Link href={`/boutique/${category.slug}`} className="hover:text-ink">
                {category.label}
              </Link>
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14 [&>*]:min-w-0">
        <ProductGallery images={product.images} soldOut={product.stock <= 0} />

        <div>
          <p className="text-sm font-semibold text-muted">{product.brand}</p>
          <h1 className="mt-1 text-[clamp(2.25rem,7vw,3.75rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
            {product.name}
          </h1>
          <p className="mt-4 leading-relaxed text-muted">{product.description}</p>

          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>

          <ul className="mt-8 grid gap-3 rounded-card bg-white p-5 shadow-soft">
            {perks.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm font-medium">
                <Icon size={20} />
                {text}
              </li>
            ))}
          </ul>

          {product.highlights.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {product.highlights.map((h) => (
                <li key={h} className="rounded-full bg-cream-deep px-3.5 py-1.5 text-sm font-medium">
                  {h}
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-10 text-xl font-extrabold">{t.product.specs}</h2>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            {product.specs.map(([label, value]) => (
              <div key={label} className="flex gap-4 py-3 text-[0.9375rem]">
                <dt className="w-32 shrink-0 text-muted">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Container>
  );
}
