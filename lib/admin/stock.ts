import "server-only";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOW_STOCK, type StockMovement } from "./stock-shared";

/** Seuil « stock faible » réglé par le commerçant (3 par défaut, ou sans la migration 18). */
export async function getLowStockThreshold() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "stock").maybeSingle();
  const n = Number((data?.value as { low_threshold?: unknown } | undefined)?.low_threshold);
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : DEFAULT_LOW_STOCK;
}

export type StockProduct = { id: string; name: string; stock: number; image: string | null; imageBg: string | null; isActive: boolean; category: string };

/** Page Stock : produits (stock le plus bas d'abord), derniers mouvements, seuil. */
export async function getStockPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [products, movements, threshold] = await Promise.all([
    supabase.from("products").select("id, name, stock, images, image_bg, is_active, category:categories(name)").order("stock").order("name").limit(500),
    supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(200),
    getLowStockThreshold(),
  ]);
  if (products.error) throw new Error(products.error.message);
  return {
    products: (products.data ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      stock: Number(p.stock),
      image: ((p.images as string[] | null) ?? [])[0] ?? null,
      imageBg: (p.image_bg as string | null) ?? null,
      isActive: Boolean(p.is_active),
      category: (p.category as unknown as { name: string } | null)?.name ?? "Sans catégorie",
    })) as StockProduct[],
    // Table absente (migration 18 non appliquée) : historique vide, la page reste utilisable
    movements: (movements.error ? [] : (movements.data ?? [])) as StockMovement[],
    historyReady: !movements.error,
    threshold,
  };
}
