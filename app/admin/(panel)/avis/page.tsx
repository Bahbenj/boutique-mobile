import type { Metadata } from "next";
import { listReviews } from "@/lib/admin/settings";
import { AdminPage } from "@/components/admin/AdminPage";
import { ReviewManager } from "@/components/admin/reviews/ReviewManager";

export const metadata: Metadata = { title: "Avis clients" };

export default async function AdminReviewsPage() {
  const res = await listReviews();

  if (!res.ok) {
    return (
      <AdminPage title="Avis clients">
        <p role="alert" className="rounded-card bg-danger-soft p-5 text-danger">
          Avis illisibles : {res.error}. La migration 9 (supabase/all-in-one.sql) a-t-elle été exécutée ?
        </p>
      </AdminPage>
    );
  }

  const published = res.reviews.filter((r) => r.is_published).length;
  return (
    <AdminPage title="Avis clients" description={`${res.reviews.length} avis, dont ${published} publié${published > 1 ? "s" : ""}`}>
      <ReviewManager reviews={res.reviews} />
    </AdminPage>
  );
}
