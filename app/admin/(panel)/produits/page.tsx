import type { Metadata } from "next";
import Link from "next/link";
import { listCategories, listProducts, type ProductFilters as Filters } from "@/lib/admin/catalog";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductFilters } from "@/components/admin/products/ProductFilters";
import { ProductRow } from "@/components/admin/products/ProductRow";
import { buttonClasses } from "@/components/ui/Button";
import { IconPlus } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Produits" };

const pick = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/produits">) {
  const sp = await searchParams;
  const filters: Filters = {
    q: typeof sp.q === "string" ? sp.q.slice(0, 80) : undefined,
    categorie: typeof sp.categorie === "string" ? sp.categorie : undefined,
    statut: pick(sp.statut, ["actifs", "inactifs", "rupture", "faible", "vedettes"] as const),
    tri: pick(sp.tri, ["recent", "nom", "stock", "prix"] as const),
  };
  const [{ products, count }, categories] = await Promise.all([listProducts(filters), listCategories()]);
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const filtered = Boolean(filters.q || filters.categorie || filters.statut);

  return (
    <AdminPage
      title="Produits"
      description={`${count} produit${count > 1 ? "s" : ""}${filtered ? " trouvé" + (count > 1 ? "s" : "") : ""}`}
      actions={
        <Link href="/admin/produits/nouveau" className={buttonClasses("primary", "md")}>
          <IconPlus size={18} />
          Nouveau produit
        </Link>
      }
    >
      <ProductFilters categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      {products.length === 0 ? (
        <div className="mt-6 rounded-card bg-surface p-8 text-center shadow-soft">
          <p className="font-semibold">{filtered ? "Aucun produit ne correspond à ces filtres." : "Aucun produit pour l'instant."}</p>
          {!filtered && (
            <Link href="/admin/produits/nouveau" className={buttonClasses("dark", "md", "mt-4")}>
              Créer le premier produit
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-5 lg:overflow-hidden lg:rounded-card lg:bg-surface lg:shadow-soft">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_9.5rem_5.5rem_7.5rem] gap-4 border-b border-line px-4 py-3 text-xs font-semibold text-muted lg:grid"
          >
            <span />
            <span>Produit</span>
            <span>Prix</span>
            <span>Stock</span>
            <span>En ligne</span>
            <span className="text-end">Actions</span>
          </div>
          <ul className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-line">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} categoryName={p.category_id ? names.get(p.category_id) : undefined} />
            ))}
          </ul>
        </div>
      )}
    </AdminPage>
  );
}
