import type { Metadata } from "next";
import { listCategories } from "@/lib/admin/catalog";
import { AdminPage } from "@/components/admin/AdminPage";
import { CategoryManager } from "@/components/admin/categories/CategoryManager";

export const metadata: Metadata = { title: "Catégories" };

export default async function AdminCategoriesPage() {
  const categories = await listCategories();
  return (
    <AdminPage title="Catégories" description={`${categories.length} catégorie${categories.length > 1 ? "s" : ""}`}>
      <CategoryManager categories={categories} />
    </AdminPage>
  );
}
