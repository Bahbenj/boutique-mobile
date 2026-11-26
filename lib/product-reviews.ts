import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Avis clients publiés d'un produit (migration 24), lus avec la clé publique :
 * la RLS ne renvoie que les avis publiés, et seulement les colonnes publiques
 * (jamais l'identifiant du client, le motif de refus ni les signalements).
 * Invalidés par la modération (updateTag PRODUCT_REVIEWS_TAG).
 */
export const PRODUCT_REVIEWS_TAG = "product-reviews";

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  recommends: boolean;
  photos: string[];
  author_name: string;
  verified_purchase: boolean;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export async function getPublishedReviews(productId: string): Promise<PublicReview[]> {
  "use cache";
  cacheTag(PRODUCT_REVIEWS_TAG);
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/i.test(productId)) {
    cacheLife("max");
    return [];
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from("product_reviews")
    .select("id, rating, title, body, recommends, photos, author_name, verified_purchase, reply, replied_at, created_at")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    cacheLife("minutes"); // table absente (migration 24 non appliquée) : pas d'avis
    return [];
  }
  cacheLife("hours");
  return (data ?? []) as PublicReview[];
}
