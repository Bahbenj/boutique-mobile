import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder, getOrderHistory } from "@/lib/admin/orders";
import { OrderDetail } from "@/components/admin/orders/OrderDetail";

export const metadata: Metadata = { title: "Commande" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/commandes/[id]">) {
  const { id } = await params;
  const [order, history] = await Promise.all([getOrder(id), getOrderHistory(id)]);
  if (!order) notFound();
  return <OrderDetail order={order} history={history} />;
}
