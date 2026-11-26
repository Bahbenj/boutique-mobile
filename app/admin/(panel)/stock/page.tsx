import type { Metadata } from "next";
import { getStockPage } from "@/lib/admin/stock";
import { requireStaff } from "@/lib/auth";
import { AdminPage } from "@/components/admin/AdminPage";
import { StockManager } from "@/components/admin/stock/StockManager";

export const metadata: Metadata = { title: "Stock" };

export default async function AdminStockPage() {
  const staff = await requireStaff();
  const data = await getStockPage();
  return (
    <AdminPage title="Stock" description="Quantités en magasin et historique des mouvements">
      <StockManager {...data} canManage={staff.role !== "seller"} />
    </AdminPage>
  );
}
