import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, listProducts, type ProductFilters as Filters } from "@/lib/admin/catalog";
import { productStatusFilters, type ProductStatusFilter } from "@/lib/admin/schema";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductFilters } from "@/components/admin/products/ProductFilters";
import { AddProductFab, ProductList } from "@/components/admin/products/ProductList";
import { buttonClasses } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Produits" };

const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);
const statuses = [...Object.keys(productStatusFilters), "actifs", "inactifs"] as ProductStatusFilter[];

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produits">) {
  const sp = await searchParams;
  const filters: Filters = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined,
    categorie: typeof sp.categorie === "string" ? sp.categorie : undefined,
    statut: pick(sp.statut, statuses),
    tri: pick(sp.tri, ["recent", "nom", "stock", "prix"] as const),
  };
  const [{ products, count, now }, categories] = await Promise.all([listProducts(filters), listCategories()]);
  const filtered = Boolean(filters.q || filters.categorie || filters.statut);

  return (
    <AdminPage
      title="Produits"
      description={`${count} produit${count > 1 ? "s" : ""}${filtered ? " trouvé" + (count > 1 ? "s" : "") : ""}`}
      actions={
        <Link href="/admin/produits/nouveau" className={buttonClasses("primary", "md", "max-lg:hidden")}>
          <IconPlus size={18} />
          Ajouter un produit
        </Link>
      }
    >
      <ProductFilters categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <div className="mt-4">
        {products.length === 0 ? (
          <div className="rounded-card bg-surface p-8 text-center shadow-soft">
            <p className="text-lg font-bold">{filtered ? "Aucun produit ne correspond à ces filtres." : "Aucun produit. Ajoutez le premier."}</p>
            <p className="mt-1 text-sm text-muted">
              {filtered ? "Essayez une autre recherche ou retirez un filtre." : "Il faut seulement un nom, une catégorie, un prix et une photo."}
            </p>
            {filtered ? (
              <Link href="/admin/produits" className={buttonClasses("light", "md", "mt-5")}>
                Voir tous les produits
              </Link>
            ) : (
              <Link href="/admin/produits/nouveau" className={buttonClasses("primary", "md", "mt-5")}>
                <IconPlus size={18} />
                Ajouter un produit
              </Link>
            )}
          </div>
        ) : (
          <ProductList products={products} categories={categories.map((c) => ({ id: c.id, name: c.name }))} now={now} />
        )}
      </div>
      <AddProductFab />
    </AdminPage>
  );
}
