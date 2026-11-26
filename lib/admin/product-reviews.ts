import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Modération des avis produits (propriétaire et gérant ; admin_product_reviews, migration 24). */
export type AdminProductReview = {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  user_email: string | null;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  recommends: boolean;
  photos: string[];
  verified_purchase: boolean;
  status: "pending" | "published" | "rejected" | "hidden";
  reject_reason: string | null;
  reply: string | null;
  replied_at: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  report_count: number;
  created_at: string;
  updated_at: string;
};

export async function listProductReviews(status?: AdminProductReview["status"]) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_product_reviews", { p_status: status ?? null });
  if (error) return { ready: false, reviews: [] as AdminProductReview[] };
  return { ready: true, reviews: (data ?? []) as AdminProductReview[] };
}

/** Nombre d'avis à valider (tableau de bord) ; 0 sans la migration 24. */
export async function pendingReviewsCount() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_pending_reviews_count");
  return error ? 0 : Number(data ?? 0);
}
