import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listCategories } from "@/lib/admin/catalog";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { IconExternal } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Modifier le produit" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/produits/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, categories] = await Promise.all([getProduct(id), listCategories()]);
  if (!product) notFound();

  return (
    <AdminPage
      title={product.name}
      description={
        product.is_active ? (
          <a href={`/produit/${product.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink hover:underline">
            Voir sur le site <IconExternal size={14} />
          </a>
        ) : (
          "Hors ligne : invisible sur le site"
        )
      }
      actions={
        <Link href="/admin/produits" className="text-sm font-semibold text-muted hover:text-ink">
          ← Produits
        </Link>
      }
    >
      {/* key : réinitialise le formulaire si l'on passe d'un produit à sa copie */}
      <ProductForm key={product.id} product={product} categories={categories.map((c) => ({ id: c.id, name: c.name }))} isCopy={sp.copie === "1"} />
    </AdminPage>
  );
}
