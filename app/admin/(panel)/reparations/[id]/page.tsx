import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepair } from "@/lib/admin/repairs";
import { RepairDetail } from "@/components/admin/repairs/RepairDetail";

export const metadata: Metadata = { title: "Réparation" };

export default async function AdminRepairPage({ params }: PageProps<"/admin/reparations/[id]">) {
  const repair = await getRepair((await params).id);
  if (!repair) notFound();
  return <RepairDetail repair={repair} />;
}
