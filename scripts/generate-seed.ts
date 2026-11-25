/**
 * Génère supabase/seed.sql (catégories + produits d'exemple) depuis data/products.ts.
 * Usage : npm run seed:generate   puis exécuter supabase/seed.sql dans Supabase.
 * Idempotent : « on conflict (slug) do nothing » ne remplace jamais une saisie existante.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { categories, products } from "../data/products";

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const num = (v: number | null | undefined) => (v == null ? "null" : String(v));
const arr = (v: string[]) => (v.length ? `array[${v.map(q).join(", ")}]::text[]` : "'{}'::text[]");
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const lines: string[] = [
  "-- Généré par scripts/generate-seed.ts depuis data/products.ts : ne pas modifier à la main.",
  "-- Produits et catégories d'exemple : photos du client (public/photos) ou visuels provisoires.",
  "-- Nécessite la migration 11 (colonnes tag, free_delivery, image_bg).",
  "",
  "insert into public.categories (name, slug, description, image, position) values",
  categories
    .map((c, i) => `  (${q(c.title)}, ${q(c.slug)}, ${q(c.description)}, ${q(c.image)}, ${i})`)
    .join(",\n") + "\non conflict (slug) do nothing;",
  "",
];

for (const p of products) {
  const variants = {
    ...(p.colors?.length ? { colors: p.colors } : {}),
    ...(p.storage?.length
      ? { storage: p.storage.map((s) => ({ label: s.label, price: s.price, ...(s.oldPrice ? { old_price: s.oldPrice } : {}) })) }
      : {}),
  };
  lines.push(
    `insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select ${q(p.name)}, ${q(p.slug)}, ${q(p.description)}, (select id from public.categories where slug = ${q(p.category)}), ${q(p.brand)}, ${num(p.price)}, ${num(p.oldPrice)}, ${p.stock}, ${q(p.condition)}, ${q(p.grade)}, ${num(p.battery)}, ${p.isNew}, ${p.isFeatured}, ${p.isActive}, ${q(p.tag)}, ${Boolean(p.freeDelivery)}, ${q(p.imageBg)}, ${arr(p.images.map((i) => i.src))}, ${json(variants)}, ${arr(p.highlights)}, ${json(p.specs)}
on conflict (slug) do nothing;`,
    "",
  );
}

writeFileSync(join(process.cwd(), "supabase", "seed.sql"), lines.join("\n"));
console.log(`supabase/seed.sql : ${categories.length} catégories, ${products.length} produits`);
