import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getProductBySlug } from "@/lib/catalog";
import { getCustomer } from "@/lib/customer";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm, type MyReview } from "@/components/account/ReviewForm";
import { AuthShell } from "@/components/account/AuthShell";

export const metadata: Metadata = { title: "Donner mon avis", robots: { index: false } };

/** Avis sur un produit (?produit=slug) : création ou modification du sien. Compte requis (proxy). */
export default function ReviewPage({ searchParams }: PageProps<"/compte/avis">) {
  return (
    <Suspense>
      <Review searchParams={searchParams} />
    </Suspense>
  );
}

async function Review({ searchParams }: Pick<PageProps<"/compte/avis">, "searchParams">) {
  const slug = (await searchParams).produit;
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(slug)) notFound();
  const [customer, product] = await Promise.all([getCustomer(), getProductBySlug(slug)]);
  if (!customer) redirect(`/compte/connexion?next=${encodeURIComponent(`/compte/avis?produit=${slug}`)}`);
  if (!product) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("my_product_reviews");
  const review = ((data ?? []) as (MyReview & { product_id: string })[]).find((r) => r.product_id === product.id) ?? null;

  return (
    <AuthShell
      title={review ? "Mon avis" : "Donner mon avis"}
      footer={
        <Link href={`/produit/${product.slug}`} className="font-semibold text-accent underline-offset-4 hover:underline">
          Retour au produit
        </Link>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-raised">
          <Image src={product.images[0].src} alt="" fill sizes="56px" className="object-cover" />
        </span>
        <p className="font-bold">{product.name}</p>
      </div>
      <ReviewForm productId={product.id} productSlug={product.slug} userId={customer.id} review={review} />
    </AuthShell>
  );
}
