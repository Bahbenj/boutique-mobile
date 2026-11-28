import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Données de test : tout ce que créent les parcours porte une marque reconnaissable,
 * pour être effacé à la fin (et par `npm run test:e2e:clean` après un arrêt brutal).
 *   comptes      e2e-…@example.com
 *   produit      slug e2e-…    catégorie  slug e2e-…
 *   téléphones   70 00 00 01 (client), 70 00 00 02 (réparation)
 *   code promo   E2E…
 */
export const E2E = {
  emailDomain: "@example.com",
  emailPrefix: "e2e-",
  slugPrefix: "e2e-",
  customerPhone: "70000001",
  repairPhone: "70000002",
  promoPrefix: "E2E",
  password: "Essai-e2e-2026",
};

export function service(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Parcours e2e : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont nécessaires (.env.local).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const runId = () => Date.now().toString(36);

/** Compte confirmé (sans e-mail envoyé). role : membre de l'équipe, sinon client. */
export async function createUser(sb: SupabaseClient, kind: string, opts: { role?: "owner" | "manager" | "seller"; fullName: string; phone?: string }) {
  const email = `${E2E.emailPrefix}${kind}-${runId()}${E2E.emailDomain}`;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: E2E.password,
    email_confirm: true,
    user_metadata: { full_name: opts.fullName, phone: opts.phone ?? "", cgv_accepted: true },
  });
  if (error || !data.user) throw new Error(`Création du compte ${kind} impossible : ${error?.message}`);
  if (opts.role) {
    const { error: e2 } = await sb.from("admins").insert({ user_id: data.user.id, role: opts.role });
    if (e2) throw new Error(`Accès équipe impossible : ${e2.message}`);
  }
  return { id: data.user.id, email };
}

const storagePath = (url: string) => decodeURIComponent(url.split("/storage/v1/object/public/catalog/")[1] ?? "");

/** Efface toutes les données marquées e2e (idempotent). Renvoie un résumé. */
export async function cleanup(sb: SupabaseClient) {
  const done: string[] = [];
  const count = (label: string, n?: number | null) => n && done.push(`${n} ${label}`);

  // Comptes de test
  const users: { id: string; email: string }[] = [];
  for (let page = 1; page < 50; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    const batch = data?.users ?? [];
    users.push(...batch.filter((u) => u.email?.startsWith(E2E.emailPrefix) && u.email.endsWith(E2E.emailDomain)).map((u) => ({ id: u.id, email: u.email! })));
    if (batch.length < 200) break;
  }
  const ids = users.map((u) => u.id);

  // Commandes (historique en cascade), réparations, avis et leurs photos
  const phones = [E2E.customerPhone, E2E.repairPhone];
  const orderFilter = ids.length ? `user_id.in.(${ids.join(",")}),phone.in.(${phones.join(",")})` : `phone.in.(${phones.join(",")})`;
  count("commande(s)", (await sb.from("orders").delete({ count: "exact" }).or(orderFilter)).count);
  count("demande(s) de réparation", (await sb.from("repair_requests").delete({ count: "exact" }).in("phone", phones)).count);
  if (ids.length) {
    count("avis", (await sb.from("product_reviews").delete({ count: "exact" }).in("user_id", ids)).count);
    for (const id of ids) {
      const { data: files } = await sb.storage.from("catalog").list(`reviews/${id}`);
      if (files?.length) await sb.storage.from("catalog").remove(files.map((f) => `reviews/${id}/${f.name}`));
    }
  }

  // Promotions et codes
  count("code(s) promo", (await sb.from("promo_codes").delete({ count: "exact" }).like("code", `${E2E.promoPrefix}%`)).count);

  // Produits (photos et historique de stock), puis catégories
  const { data: products } = await sb.from("products").select("id, images").like("slug", `${E2E.slugPrefix}%`);
  if (products?.length) {
    const pids = products.map((p) => p.id);
    await sb.from("promotions").delete().in("product_id", pids);
    await sb.from("stock_movements").delete().in("product_id", pids);
    const paths = products.flatMap((p) => (p.images as string[]).filter((u) => u.includes("/storage/v1/object/public/catalog/")).map(storagePath));
    if (paths.length) await sb.storage.from("catalog").remove(paths);
    count("produit(s)", (await sb.from("products").delete({ count: "exact" }).in("id", pids)).count);
  }
  const { data: cats } = await sb.from("categories").select("id, image").like("slug", `${E2E.slugPrefix}%`);
  if (cats?.length) {
    const paths = cats.map((c) => c.image as string | null).filter((u): u is string => Boolean(u?.includes("/storage/v1/object/public/catalog/"))).map(storagePath);
    if (paths.length) await sb.storage.from("catalog").remove(paths);
    count("catégorie(s)", (await sb.from("categories").delete({ count: "exact" }).in("id", cats.map((c) => c.id))).count);
  }

  // Journal d'activité des comptes de test, puis les comptes (profils et adresses en cascade)
  if (users.length) {
    await sb.from("activity_log").delete().in("actor_email", users.map((u) => u.email));
    await sb.from("admins").delete().in("user_id", ids);
    for (const id of ids) await sb.auth.admin.deleteUser(id);
    count("compte(s)", users.length);
  }
  return done.length ? done.join(", ") : "rien à effacer";
}
