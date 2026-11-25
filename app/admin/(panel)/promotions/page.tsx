import type { Metadata } from "next";
import { getPromotionsPage } from "@/lib/admin/promotions";
import { AdminPage } from "@/components/admin/AdminPage";
import { PromotionsManager } from "@/components/admin/promotions/PromotionsManager";

export const metadata: Metadata = { title: "Promotions" };

export default async function AdminPromotionsPage() {
  const data = await getPromotionsPage();
  return (
    <AdminPage title="Promotions" description="Remises automatiques et codes promo">
      <PromotionsManager {...data} />
    </AdminPage>
  );
}
