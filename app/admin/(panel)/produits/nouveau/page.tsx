import type { Metadata } from "next";
import { listCategories } from "@/lib/admin/catalog";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  const categories = await listCategories();
  return (
    <AdminPage title="Nouveau produit">
      <ProductForm product={null} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </AdminPage>
  );
}
