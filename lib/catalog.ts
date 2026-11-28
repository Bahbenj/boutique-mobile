import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { categories as staticCategories, products as staticProducts, type Category, type Product } from "@/data/products";
import { campaignPrice, type Campaign } from "@/lib/promo-shared";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Utilitaires purs, aussi utilisés par les composants client (lib/product-helpers.ts)
export { LOW_STOCK, discountPercent, hasPriceRange, stockState, type StockState } from "@/lib/product-helpers";

/**
 * Accès au catalogue du site public. Les pages n'importent jamais data/products.ts.
 *
 * Source : Supabase (tables categories et products), lue avec la clé publique :
 * la Row Level Security ne laisse voir que les produits en ligne (is_active).
 * Cache : `"use cache"` étiqueté CATALOG_TAG, invalidé à chaque modification
 * dans l'admin (produits, catégories, statut de commande) et après chaque
 * commande (stock). Secours : data/products.ts si Supabase n'est pas configuré
 * ou injoignable ; ce repli n'est gardé que quelques minutes, pour revenir vite
 * aux vraies données.
 */

export const CATALOG_TAG = "catalog";

type Catalog = { categories: Category[]; products: Product[]; source: "db" | "static" };

/** Visuel provisoire quand une catégorie ou un produit n'a pas encore de photo. */
const PLACEHOLDERS = new Set(["smartphones", "ecouteurs-casques", "montres", "accessoires", "protections", "gadgets"]);
const placeholderFor = (slug: string) => `/photos/provisoire/${PLACEHOLDERS.has(slug) ? slug : "gadgets"}.svg`;

type DbRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  price: number;
  old_price: number | null;
  stock: number;
  condition: Product["condition"];
  grade: string | null;
  battery: number | null;
  is_new: boolean;
  is_featured: boolean;
  is_active: boolean;
  images: string[];
  variants: { colors?: { name: string; hex: string }[]; storage?: { label: string; price: number; old_price?: number | null }[] } | null;
  highlights: string[];
  specs: [string, string][];
  promo_price: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  tag: string | null;
  free_delivery: boolean | null;
  image_bg: string | null;
  category_id: string | null;
  category: { slug: string } | null;
};

/** Promo en cours à l'instant `now` (mêmes règles que product_current_price en base). */
const promoActive = (r: Pick<DbRow, "promo_price" | "promo_starts_at" | "promo_ends_at">, now: number) =>
  r.promo_price != null &&
  (!r.promo_starts_at || Date.parse(r.promo_starts_at) <= now) &&
  (!r.promo_ends_at || Date.parse(r.promo_ends_at) > now);

/**
 * Prix affiché (même règle que place_order) : le plus bas entre la promo du
 * produit et la meilleure promotion en cours (produit, catégorie, tout le site),
 * le prix normal barré s'il y a une remise. Capacités : chacune remisée à part.
 */
function toProduct(r: DbRow, now: number, campaigns: Campaign[]): Product {
  const categorySlug = r.category?.slug ?? "";
  const target = { id: r.id, categoryId: r.category_id };
  const base = Number(r.price);
  const own = promoActive(r, now) && !r.variants?.storage?.length ? Number(r.promo_price) : base;
  const price = base > 0 ? Math.min(own, campaignPrice(base, target, campaigns, now)) : base;
  const images = (r.images ?? []).filter(Boolean);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    brand: r.brand ?? "",
    category: categorySlug,
    condition: r.condition,
    // Remise en cours : prix remisé affiché, prix normal barré
    price,
    ...(price < base ? { oldPrice: base } : r.old_price != null ? { oldPrice: Number(r.old_price) } : {}),
    images: (images.length ? images : [placeholderFor(categorySlug)]).map((src, i) => ({
      src,
      alt: images.length ? (i === 0 ? r.name : `${r.name}, photo ${i + 1}`) : `${r.name} (visuel provisoire)`,
    })),
    ...(r.variants?.colors?.length ? { colors: r.variants.colors } : {}),
    ...(r.variants?.storage?.length
      ? {
          storage: r.variants.storage.map((s) => {
            const sPrice = campaignPrice(Number(s.price), target, campaigns, now);
            return {
              label: s.label,
              price: sPrice,
              ...(sPrice < Number(s.price) ? { oldPrice: Number(s.price) } : s.old_price != null ? { oldPrice: Number(s.old_price) } : {}),
            };
          }),
        }
      : {}),
    stock: r.stock,
    ...(r.grade ? { grade: r.grade as Product["grade"] } : {}),
    ...(r.battery != null ? { battery: r.battery } : {}),
    highlights: r.highlights ?? [],
    specs: r.specs ?? [],
    description: r.description ?? "",
    isNew: r.is_new,
    ...(r.tag ? { tag: r.tag } : {}),
    ...(r.free_delivery ? { freeDelivery: true } : {}),
    ...(r.image_bg ? { imageBg: r.image_bg } : {}),
    isFeatured: r.is_featured,
    isActive: r.is_active,
  };
}

const staticCatalog = (): Catalog => ({ categories: staticCategories, products: staticProducts, source: "static" });

type Life = "max" | "minutes" | { stale: number; revalidate: number; expire: number };

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  const { catalog, life } = await loadCatalog();
  if (life === "max") cacheLife("max");
  else if (life === "minutes") cacheLife("minutes");
  else cacheLife(life);
  return catalog;
}

/** Lecture de la base, sans cache ; `life` = durée de cache conseillée pour ce résultat. */
async function loadCatalog(): Promise<{ catalog: Catalog; life: Life }> {
  if (!isSupabaseConfigured) {
    return { catalog: staticCatalog(), life: "max" }; // aucune base : les données statiques ne changent qu'au déploiement
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [cats, prods, promos, ratings] = await Promise.all([
    supabase.from("categories").select("id, name, slug, description, image, position").order("position").order("name"),
    supabase
      .from("products")
      .select(
        "id, name, slug, description, brand, price, old_price, promo_price, promo_starts_at, promo_ends_at, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs, tag, free_delivery, image_bg, created_at, category_id, category:categories(slug)",
      )
      .eq("is_active", true)
      .gt("price", 0) // « Prix à renseigner » : jamais affiché
      .order("created_at", { ascending: true }),
    // Promotions actives (la RLS ne montre que celles-ci) ; table absente = aucune promotion
    supabase.from("promotions").select("kind, value, scope, category_id, product_id, starts_at, ends_at").eq("is_active", true),
    // Avis publiés (moyenne par produit) ; fonction absente = pas encore de notes
    supabase.rpc("product_rating_stats"),
  ]);

  const error = cats.error ?? prods.error;
  if (error) {
    // Base injoignable ou migration manquante : le site reste en ligne avec le catalogue statique
    console.error("[catalogue] Supabase illisible, repli sur data/products.ts :", error.message);
    return { catalog: staticCatalog(), life: "minutes" };
  }

  const rows = prods.data as unknown as DbRow[];
  const now = Date.now();
  // Invalidé immédiatement par l'admin (updateTag). Sinon relu toutes les heures,
  // ou dès le prochain début / fin de promo pour que le prix affiché change à l'heure dite.
  const campaigns = (promos.error ? [] : (promos.data ?? [])) as Campaign[];
  const boundaries = [...rows.flatMap((r) => [r.promo_starts_at, r.promo_ends_at]), ...campaigns.flatMap((c) => [c.starts_at, c.ends_at])]
    .map((d) => (d ? Date.parse(d) : NaN))
    .filter((t) => t > now);
  const nextChange = boundaries.length ? Math.ceil((Math.min(...boundaries) - now) / 1000) : 3600;
  const life: Life = { stale: 60, revalidate: Math.max(60, Math.min(3600, nextChange)), expire: 86_400 };
  const ratingOf = new Map(
    ((ratings.error ? [] : ratings.data) as { product_id: string; reviews: number; average: number; recommend_pct: number }[] | null ?? []).map((s) => [
      s.product_id,
      { average: Number(s.average), count: Number(s.reviews), recommendPct: Number(s.recommend_pct) },
    ]),
  );
  const products = rows.map((r) => {
    const p = toProduct(r, now, campaigns);
    const rating = ratingOf.get(r.id);
    return rating ? { ...p, rating } : p;
  });
  const firstImage = (slug: string) => products.find((p) => p.category === slug && !p.images[0].src.includes("/provisoire/"))?.images[0].src;
  const categories: Category[] = (cats.data ?? []).map((c) => ({
    slug: c.slug,
    label: c.name,
    title: c.name,
    description: c.description ?? "",
    image: c.image || firstImage(c.slug) || placeholderFor(c.slug),
    alt: c.name,
  }));
  return { catalog: { categories, products, source: "db" }, life };
}

const active = async () => (await getCatalog()).products.filter((p) => p.isActive);

export async function getProducts(category?: string): Promise<Product[]> {
  const list = await active();
  return category ? list.filter((p) => p.category === category) : list;
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return (await active()).filter((p) => p.isFeatured).slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await active()).find((p) => p.slug === slug);
}

const SLUG = /^[a-z0-9-]{1,120}$/;

/**
 * Comme getProductBySlug, mais un produit absent du cache est cherché dans la base
 * avant de conclure « introuvable ». Juste après sa création dans l'admin, le cache
 * des fiches peut garder l'ancien catalogue quelques secondes : sans ce contrôle, le
 * gérant qui clique « Voir sur le site » tombait sur une page 404. Coût : une petite
 * requête pour une adresse inconnue, le catalogue complet seulement si le produit existe.
 */
export async function findProductBySlug(slug: string): Promise<Product | undefined> {
  const cached = await getProductBySlug(slug);
  if (cached || !isSupabaseConfigured || !SLUG.test(slug)) return cached;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.from("products").select("id").eq("slug", slug).eq("is_active", true).gt("price", 0).limit(1);
  if (!data?.length) return undefined;
  return (await loadCatalog()).catalog.products.find((p) => p.slug === slug && p.isActive);
}

/** Même principe pour une catégorie créée à l'instant. */
export async function findCategory(slug: string) {
  const cached = await getCategory(slug);
  if (cached || !isSupabaseConfigured || !SLUG.test(slug)) return cached;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.from("categories").select("id").eq("slug", slug).limit(1);
  if (!data?.length) return undefined;
  return (await loadCatalog()).catalog.categories.find((c) => c.slug === slug);
}

export async function getCategories() {
  const { categories } = await getCatalog();
  const list = await active();
  return categories.map((c) => ({ ...c, count: list.filter((p) => p.category === c.slug).length }));
}

/** Puces de la boutique : « Tout » + un rayon par catégorie, avec leur nombre de produits. */
export async function getCategoryChips() {
  const cats = await getCategories();
  const all = (await active()).length;
  return [{ label: "Tout", count: all }, ...cats.map((c) => ({ slug: c.slug, label: c.label, count: c.count }))];
}

export async function getCategory(slug: string) {
  return (await getCatalog()).categories.find((c) => c.slug === slug);
}
