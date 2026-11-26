import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { money } from "@/lib/meta-pixel";
import { t } from "@/i18n";
import { getCategory, getProductBySlug, getProducts } from "@/lib/catalog";
import { Container } from "@/components/ui/Container";
import { IconCash, IconShield, IconTruck } from "@/components/ui/icons";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { TrackViewContent } from "@/components/layout/MetaPixel";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RatingInline } from "@/components/product/Stars";

/** Produits connus au build ; ceux créés ensuite dans l'admin sont rendus à la demande. */
export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
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

  // Données structurées (schema.org) : prix, disponibilité et note moyenne des avis publiés
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, "");
  const abs = (src: string) => (src.startsWith("http") ? src : `${origin}${src}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    image: product.images.map((i) => abs(i.src)),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: `${origin}/produit/${product.slug}`,
      priceCurrency: siteConfig.currency,
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: product.condition === "neuf" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    },
    ...(product.rating && product.rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count, bestRating: 5, worstRating: 1 } }
      : {}),
  };

  return (
    <Container className="pt-24 pb-20 sm:pt-32 sm:pb-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TrackViewContent
        key={product.slug}
        params={{
          content_ids: [product.slug],
          content_name: product.name,
          content_category: category?.title,
          content_type: "product",
          ...money(product.price),
        }}
      />
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/boutique" className="hover:text-fg">
              {t.product.back}
            </Link>
          </li>
          {category && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <Link href={`/boutique/${category.slug}`} className="hover:text-fg">
                {category.label}
              </Link>
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-fg">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14 [&>*]:min-w-0">
        <ProductGallery images={product.images} soldOut={product.stock <= 0} imageBg={product.imageBg} />

        <div>
          <p className="text-sm font-semibold text-muted">{product.brand}</p>
          <h1 className="mt-1 text-[clamp(2.25rem,7vw,3.75rem)] leading-[0.95] font-extrabold tracking-[-0.04em]">
            {product.name}
          </h1>
          {product.rating && (
            <a href="#avis" className="mt-2 inline-flex min-h-9 items-center hover:underline">
              <RatingInline average={product.rating.average} count={product.rating.count} />
              <span className="ms-2 text-sm text-muted">· {product.rating.recommendPct} % recommandent</span>
            </a>
          )}
          <p className="mt-4 leading-relaxed text-muted">{product.description}</p>

          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>

          <ul className="mt-8 grid gap-3 rounded-card bg-surface p-5 shadow-soft [&_svg]:text-accent">
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
                <li key={h} className="rounded-full bg-raised px-3.5 py-1.5 text-sm font-medium">
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

      <ProductReviews product={product} />
    </Container>
  );
}
