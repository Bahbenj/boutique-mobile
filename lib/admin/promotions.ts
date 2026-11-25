import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { DbPromoCode, DbPromotion } from "./promo-schema";

/** Lectures de la page Promotions (session admin, soumises à la RLS). */
export async function getPromotionsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [promos, codes, uses, cats, prods] = await Promise.all([
    supabase.from("promotions").select("*").order("created_at", { ascending: false }),
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("promo_code").not("promo_code", "is", null).neq("status", "annulee").limit(10_000),
    supabase.from("categories").select("id, name").order("position"),
    supabase.from("products").select("id, name, price").order("name").limit(500),
  ]);
  const error = promos.error ?? codes.error;
  if (error) throw new Error(error.message);

  const count = new Map<string, number>();
  for (const o of uses.data ?? []) count.set(o.promo_code as string, (count.get(o.promo_code as string) ?? 0) + 1);

  return {
    promotions: (promos.data ?? []).map((p) => ({ ...p, value: Number(p.value) })) as DbPromotion[],
    codes: (codes.data ?? []).map((c) => ({
      ...c,
      value: Number(c.value),
      min_order: Number(c.min_order),
      uses: count.get(c.code) ?? 0,
    })) as DbPromoCode[],
    categories: (cats.data ?? []) as { id: string; name: string }[],
    products: (prods.data ?? []).map((p) => ({ id: p.id as string, name: p.name as string, price: Number(p.price) })),
    // Heure de lecture : statut « en cours / programmée / terminée » (pas d'horloge au rendu)
    now: Date.now(),
  };
}
