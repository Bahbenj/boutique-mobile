// npm run test:sql : rejoue supabase/all-in-one.sql deux fois sur un Postgres en mémoire
// (PGlite, schémas auth et storage simulés) puis vérifie règles, droits et limites.
// Teste supabase/all-in-one.sql sur un Postgres en mémoire (PGlite), avec des
// schémas Supabase simulés, puis vérifie place_order (prix, stock, livraison offerte).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const sql = readFileSync(process.argv[2], "utf8");
const db = new PGlite();
// Les séries historiques passent des dizaines de commandes avec le même compte :
// la limite de la migration 26 est coupée pour elles, puis testée à part (fin du fichier).
let rateGuard = false;
const load = async () => {
  await db.exec(sql);
  if (!rateGuard) await db.exec("alter table public.orders disable trigger orders_rate_guard");
};

await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, last_sign_in_at timestamptz, email_confirmed_at timestamptz, created_at timestamptz default now(), raw_user_meta_data jsonb, raw_app_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
  grant usage on schema storage to authenticated; grant select, insert, delete on storage.objects to authenticated;
  alter table storage.objects enable row level security;
`);

const t0 = Date.now();
await load();
console.log(`all-in-one.sql appliqué (${Date.now() - t0} ms)`);
// Rejouable : deuxième passage sans erreur ni doublon
await load();
const count = async (q) => Number((await db.query(q)).rows[0].n);
assert.equal(await count("select count(*) as n from public.products"), 11, "11 produits");
assert.equal(await count("select count(*) as n from public.categories"), 6, "6 catégories");
console.log("rejouable : OK (11 produits, 6 catégories après deux passages)");

// Client de test confirmé : utilisateur par défaut des commandes (place_order exige un compte)
const BASE = "00000000-0000-0000-0000-0000000000c1";
await db.query("insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, 'client.test@exemple.ml', now(), '{\"full_name\":\"Client Test\",\"phone\":\"76123456\"}')", [BASE]);
await db.exec(`select set_config('test.uid', '${BASE}', false)`);

const sb = (await db.query("select id, price, stock, tag, free_delivery, image_bg from public.products where slug = 'casque-bluetooth-super-bass'")).rows[0];
assert.equal(sb.tag, "Promo");
assert.equal(sb.free_delivery, true);
const watch = (await db.query("select id, price, stock, image_bg from public.products where slug = 'montre-connectee-yesido-io22'")).rows[0];
assert.equal(watch.image_bg, "#ffffff");
const batt = (await db.query("select id, variants from public.products where slug = 'mini-batterie-porte-cles'")).rows[0];
console.log("colonnes promo / livraison offerte / fond : OK");

const order = async (items, delivery = "home", zone = "bamako-commune-1", payment = "cod") => {
  const customer = { name: "Client Test", phone: "76123456", zone_id: zone, city: "Bamako", address: "Rue test, porte 12", note: "" };
  const r = await db.query("select * from public.place_order($1::jsonb, $2::jsonb, $3, $4)", [JSON.stringify(customer), JSON.stringify(items), delivery, payment]);
  const o = (await db.query("select number, subtotal, delivery_fee, total, region, items from public.orders where id = $1", [r.rows[0].order_id])).rows[0];
  return { ...r.rows[0], ...o };
};
const fail = async (p, code) => {
  await assert.rejects(p, (e) => e.message.includes(code), `erreur attendue : ${code}`);
};

// 1. Montre seule, livrée Commune I : frais de zone (1 500), prix relu en base
const o1 = await order([{ product_id: watch.id, qty: 2, color: "", storage: "" }]);
assert.equal(Number(o1.subtotal), 50000);
assert.equal(Number(o1.delivery_fee), 1500);
assert.equal(Number(o1.total), 51500);
assert.match(o1.number, /\S/);
assert.equal((await db.query("select stock from public.products where id = $1", [watch.id])).rows[0].stock, watch.stock - 2);
console.log(`commande ${o1.number} : 2 montres, 50 000 + 1 500 livraison, stock ${watch.stock} → ${watch.stock - 2} : OK`);

// 2. Avec le casque Super Bass : livraison offerte sur toute la commande
const o2 = await order([{ product_id: watch.id, qty: 1 }, { product_id: sb.id, qty: 1 }], "home", "kayes");
assert.equal(Number(o2.subtotal), 35000);
assert.equal(Number(o2.delivery_fee), 0);
console.log(`commande ${o2.number} : montre + casque Super Bass vers Kayes, livraison offerte : OK`);

// 3. Variante obligatoire : la batterie a 4 coloris
await fail(order([{ product_id: batt.id, qty: 1 }]), "invalid_variant");
const o3 = await order([{ product_id: batt.id, qty: 1, color: "Rose" }], "pickup");
assert.equal(Number(o3.delivery_fee), 0);
assert.equal(o3.items[0].color, "Rose");
console.log(`commande ${o3.number} : batterie rose, retrait en magasin : OK ; sans coloris → invalid_variant : OK`);

// 4. Refus : stock, zone désactivée, paiement désactivé, prix non modifiable par le client
await fail(order([{ product_id: watch.id, qty: 20 }]), "insufficient_stock");
await fail(order([{ product_id: watch.id, qty: 1 }], "home", "kidal"), "invalid_zone");
await fail(order([{ product_id: watch.id, qty: 1 }], "home", "bamako-commune-1", "orange_money"), "invalid_payment");
const o4 = await order([{ product_id: watch.id, qty: 1, price: 1 }]);
assert.equal(Number(o4.subtotal), 25000, "le prix envoyé par le client est ignoré");
console.log("refus stock / zone inactive / paiement désactivé, prix client ignoré : OK");

// 5. Droits : anon et authenticated ne peuvent pas appeler place_order
const grants = (await db.query("select grantee from information_schema.routine_privileges where routine_name = 'place_order'")).rows.map((r) => r.grantee);
assert.ok(grants.includes("authenticated") && !grants.includes("anon") && !grants.includes("service_role"));
console.log(`place_order exécutable par : ${[...new Set(grants)].join(", ")} : OK`);
console.log("TOUS LES TESTS SQL PASSENT");

// ===================== (a) Commandes : historique et droits =====================
const hist = async (orderId) => (await db.query("select from_status, to_status, changed_by_email from public.order_status_history where order_id = $1 order by id", [orderId])).rows;
const id1 = (await db.query("select id from public.orders where number = $1", [o1.number])).rows[0].id;
let h = await hist(id1);
assert.equal(h.length, 1);
assert.equal(h[0].from_status, null);
assert.equal(h[0].to_status, "nouvelle");
console.log("historique : création journalisée (Client / site) : OK");

// Changement par un admin : e-mail lu dans le jeton de session
await db.exec(`begin; select set_config('request.jwt.claims', '{"email":"gerant@mobile-empire.test","sub":"00000000-0000-0000-0000-000000000001"}', true);
  update public.orders set status = 'confirmee' where id = '${id1}'; commit;`);
await db.exec(`update public.orders set status = 'confirmee' where id = '${id1}'`); // même statut : rien à journaliser
h = await hist(id1);
assert.equal(h.length, 2);
assert.deepEqual([h[1].from_status, h[1].to_status, h[1].changed_by_email], ["nouvelle", "confirmee", "gerant@mobile-empire.test"]);
console.log("historique : nouvelle → confirmée par gerant@… ; même statut non journalisé : OK");

// Annulation : remise en stock par le déclencheur existant, et journalisée
const stockBefore = (await db.query("select stock from public.products where id = $1", [watch.id])).rows[0].stock;
await db.exec(`update public.orders set status = 'annulee' where id = '${id1}'`);
const stockAfter = (await db.query("select stock from public.products where id = $1", [watch.id])).rows[0].stock;
assert.equal(stockAfter, stockBefore + 2);
assert.equal((await hist(id1)).at(-1).to_status, "annulee");
console.log(`annulation : stock ${stockBefore} → ${stockAfter} (+2) et journalisée : OK`);

// Rejouer tout le script ne duplique pas l'historique
const before = Number((await db.query("select count(*) as n from public.order_status_history")).rows[0].n);
await load();
const after = Number((await db.query("select count(*) as n from public.order_status_history")).rows[0].n);
assert.equal(after, before);
console.log(`rejouable : historique inchangé (${after} lignes) : OK`);

// Droits déclarés (GRANT)
const priv = async (role, table, p) => (await db.query(`select has_table_privilege('${role}', '${table}', '${p}') as ok`)).rows[0].ok;
for (const t of ["public.orders", "public.order_status_history"]) {
  for (const p of ["select", "insert", "update", "delete"]) assert.equal(await priv("anon", t, p), false, `anon ${p} ${t}`);
}
assert.equal(await priv("authenticated", "public.orders", "insert"), false);
assert.equal(await priv("authenticated", "public.orders", "delete"), false);
assert.equal((await db.query("select has_column_privilege('authenticated', 'public.orders', 'total', 'update') as ok")).rows[0].ok, false);
assert.equal((await db.query("select has_column_privilege('authenticated', 'public.orders', 'status', 'update') as ok")).rows[0].ok, true);
for (const p of ["insert", "update", "delete"]) assert.equal(await priv("authenticated", "public.order_status_history", p), false);
console.log("GRANT : anon n'a aucun droit sur commandes et historique ; authenticated : lecture + statut seul : OK");

// Droits réels : on se met dans la peau des rôles
await assert.rejects(db.exec("set role anon; select * from public.orders;"), /permission denied/);
await db.exec("reset role");
await assert.rejects(db.exec("set role anon; insert into public.orders (customer_name, phone, region, items, subtotal, total) values ('x', '76123456', 'x', '[{}]', 0, 0);"), /permission denied/);
await db.exec("reset role");
await assert.rejects(db.exec("set role anon; select * from public.order_status_history;"), /permission denied/);
await db.exec("reset role");
await db.exec("set role authenticated; select set_config('test.uid', '00000000-0000-0000-0000-0000000000f0', false);");
const visible = Number((await db.query("select count(*) as n from public.orders")).rows[0].n);
await db.exec(`reset role; select set_config('test.uid', '${BASE}', false);`);
assert.equal(visible, 0, "un connecté non admin ne voit aucune commande");
await assert.rejects(db.exec("set role authenticated; insert into public.order_status_history (order_id, to_status) values ('" + id1 + "', 'livree');"), /permission denied/);
await db.exec("reset role");
await assert.rejects(db.exec("set role anon; select public.place_order('{}'::jsonb, '[]'::jsonb, 'home', 'cod');"), /permission denied/);
await db.exec("reset role");
console.log("rôles réels : anon refusé (lecture, écriture, place_order), authenticated non admin ne voit aucune commande : OK");
console.log("TESTS (a) COMMANDES : OK");

// ===================== (b) Demandes de réparation =====================
const repair = async (r) => (await db.query("select * from public.create_repair_request($1::jsonb)", [JSON.stringify(r)])).rows[0];
const r1 = await repair({ name: "Awa Traoré", phone: "76123456", device: "Samsung Galaxy A15", issue: "Écran cassé, tactile ne répond plus" });
assert.match(r1.request_number, /^REP-\d+$/);
const row1 = (await db.query("select * from public.repair_requests where id = $1", [r1.request_id])).rows[0];
assert.equal(row1.status, "nouvelle");
assert.equal(row1.quote_amount, null);
assert.equal(row1.internal_notes, "");
console.log(`demande ${r1.request_number} créée (statut nouvelle) : OK`);

await fail(repair({ name: "A", phone: "76123456", device: "Tecno", issue: "Écran" }), "invalid_name");
await fail(repair({ name: "Awa", phone: "12345678", device: "Tecno", issue: "Écran" }), "invalid_phone");
await fail(repair({ name: "Awa", phone: "7612345", device: "Tecno", issue: "Écran" }), "invalid_phone");
await fail(repair({ name: "Awa", phone: "76123456", device: "T", issue: "Écran" }), "invalid_device");
await fail(repair({ name: "Awa", phone: "76123456", device: "Tecno", issue: "x" }), "invalid_issue");
await fail(repair({ name: "Awa", phone: "76123456", device: "Tecno", issue: "x".repeat(1001) }), "invalid_issue");
console.log("validation : nom, numéro malien (8 chiffres, pas de 1er chiffre 0/1), modèle, panne : OK");

await repair({ name: "Awa Traoré", phone: "76123456", device: "Tecno Spark 20", issue: "Ne charge plus" });
await repair({ name: "Awa Traoré", phone: "76123456", device: "iPhone 11", issue: "Batterie faible" });
await fail(repair({ name: "Awa Traoré", phone: "76123456", device: "iPhone 12", issue: "Écran" }), "too_many_requests");
await repair({ name: "Moussa Keïta", phone: "63515582", device: "Tecno Camon", issue: "Bloqué" }); // autre numéro : accepté
console.log("anti-abus : 4e demande en une heure pour un même numéro refusée, autre numéro accepté : OK");

// Droits déclarés
for (const p of ["select", "insert", "update", "delete"]) assert.equal(await priv("anon", "public.repair_requests", p), false, `anon ${p}`);
assert.equal(await priv("authenticated", "public.repair_requests", "insert"), false);
assert.equal(await priv("authenticated", "public.repair_requests", "delete"), false);
const colPriv = async (c) => (await db.query(`select has_column_privilege('authenticated', 'public.repair_requests', '${c}', 'update') as ok`)).rows[0].ok;
for (const c of ["status", "quote_amount", "internal_notes"]) assert.equal(await colPriv(c), true, `update ${c}`);
for (const c of ["customer_name", "phone", "device", "issue", "number", "created_at"]) assert.equal(await colPriv(c), false, `update ${c} refusé`);
const rgrants = (await db.query("select grantee from information_schema.routine_privileges where routine_name = 'create_repair_request'")).rows.map((r) => r.grantee);
assert.ok(rgrants.includes("service_role") && !rgrants.includes("anon") && !rgrants.includes("authenticated"));
console.log("GRANT : anon aucun droit ; admin : lecture + statut, devis, notes seulement ; création réservée au serveur : OK");

// Droits réels
await assert.rejects(db.exec("set role anon; select * from public.repair_requests;"), /permission denied/);
await db.exec("reset role");
await assert.rejects(db.exec("set role anon; insert into public.repair_requests (customer_name, phone, device, issue) values ('Spam', '76000000', 'X', 'spam');"), /permission denied/);
await db.exec("reset role");
await assert.rejects(db.exec(`set role anon; select public.create_repair_request('{"name":"Spam","phone":"76000000","device":"X1","issue":"spam"}'::jsonb);`), /permission denied/);
await db.exec("reset role");
await db.exec("set role authenticated");
const seen = Number((await db.query("select count(*) as n from public.repair_requests")).rows[0].n);
await db.exec("reset role");
assert.equal(seen, 0, "un connecté non admin ne voit aucune demande");
await assert.rejects(db.exec(`set role authenticated; update public.repair_requests set phone = '70000000' where id = '${r1.request_id}';`), /permission denied/);
await db.exec("reset role");
console.log("rôles réels : anon refusé (lecture, écriture, fonction) ; connecté non admin : rien visible, coordonnées non modifiables : OK");

// Suivi par l'admin (colonnes autorisées), contraintes
await db.exec(`update public.repair_requests set status = 'devis_envoye', quote_amount = 25000, internal_notes = 'Écran à commander' where id = '${r1.request_id}'`);
await assert.rejects(db.exec(`update public.repair_requests set quote_amount = -5 where id = '${r1.request_id}'`), /check/);
await assert.rejects(db.exec(`update public.repair_requests set status = 'inconnu' where id = '${r1.request_id}'`), /invalid input value for enum/);
console.log("suivi : statut + devis + notes enregistrés ; devis négatif et statut inconnu refusés : OK");

const nrep = Number((await db.query("select count(*) as n from public.repair_requests")).rows[0].n);
await load();
assert.equal(Number((await db.query("select count(*) as n from public.repair_requests")).rows[0].n), nrep);
console.log("rejouable : demandes conservées : OK");
console.log("TESTS (b) RÉPARATIONS : OK");

// ===================== (c) Tableau de bord =====================
// Un vrai admin : utilisateur Auth + ligne dans public.admins ; auth.uid() simulé par test.uid
const ADMIN = "00000000-0000-0000-0000-0000000000ad";
const USER = "00000000-0000-0000-0000-0000000000ee";
await db.query("insert into auth.users (id, email) values ($1, 'gerant@test'), ($2, 'client@test')", [ADMIN, USER]);
await db.query("insert into public.admins (user_id) values ($1)", [ADMIN]);
const as = async (role, uid, q) => {
  await db.exec(`set role ${role}; select set_config('test.uid', '${uid}', false);`);
  try { return await db.query(q); } finally { await db.exec(`reset role; select set_config('test.uid', '${BASE}', false);`); }
};

await assert.rejects(as("anon", "", "select public.admin_dashboard_stats()"), /permission denied/);
await assert.rejects(as("authenticated", USER, "select public.admin_dashboard_stats()"), /forbidden/);
console.log("statistiques : visiteur refusé, connecté non admin refusé (forbidden) : OK");

const st = (await as("authenticated", ADMIN, "select public.admin_dashboard_stats() as s")).rows[0].s;
// Commandes du test : CMD-1001 annulée (51 500), puis 35 000, 7 500 (retrait), 26 500 : toutes « nouvelle »
assert.equal(Number(st.today.orders), 3);
assert.equal(Number(st.today.revenue), 69000);
assert.equal(Number(st.month.revenue), 69000);
assert.equal(Number(st.month.cancelled), 1);
assert.equal(Number(st.month.collected), 0);
assert.deepEqual(st.pending, { nouvelle: 3, confirmee: 0, expediee: 0 });
// Réparations : REP-1001 devis envoyé, 3 nouvelles
assert.deepEqual(st.repairs.pending, { nouvelle: 3, devis_envoye: 1, en_cours: 0, prete: 0 });
assert.deepEqual(st.repairs.received, { today: 4, week: 4, month: 4 });
console.log("statistiques admin : 3 commandes / 69 000 FCFA aujourd'hui (annulée exclue), 3 à confirmer ; réparations : 3 nouvelles, 1 devis envoyé, 4 reçues : OK");

// Une commande livrée compte dans « encaissé »
await db.exec(`update public.orders set status = 'livree' where number = '${o3.number}'`);
const st2 = (await as("authenticated", ADMIN, "select public.admin_dashboard_stats() as s")).rows[0].s;
assert.equal(Number(st2.month.collected), 7500);
assert.equal(Number(st2.pending.nouvelle), 2);
console.log("commande livrée : 7 500 FCFA encaissés, plus que 2 à confirmer : OK");

// L'admin voit tout, mais ne modifie que les colonnes prévues
assert.equal(Number((await as("authenticated", ADMIN, "select count(*) as n from public.orders")).rows[0].n), 4);
assert.equal(Number((await as("authenticated", ADMIN, "select count(*) as n from public.repair_requests")).rows[0].n), 4);
assert.equal(Number((await as("authenticated", ADMIN, "select count(*) as n from public.order_status_history")).rows[0].n) > 0, true);
await as("authenticated", ADMIN, `update public.repair_requests set status = 'en_cours', internal_notes = 'Pièce reçue' where id = '${r1.request_id}'`);
await assert.rejects(as("authenticated", ADMIN, `update public.repair_requests set phone = '70000000' where id = '${r1.request_id}'`), /permission denied/);
await assert.rejects(as("authenticated", ADMIN, `update public.orders set total = 1 where number = '${o2.number}'`), /permission denied/);
await assert.rejects(as("authenticated", ADMIN, `delete from public.orders where number = '${o2.number}'`), /permission denied/);
console.log("admin : voit commandes, demandes et historique ; suivi modifiable ; téléphone, montant et suppression refusés : OK");
console.log("TESTS (c) TABLEAU DE BORD : OK");

// ===================== Étape 1 : produits (promo datée, prix à renseigner) =====================
const loupe = (await db.query("select id, price, stock from public.products where slug = 'loupe-ecran'")).rows[0];
const priceOf = async (id) => Number((await order([{ product_id: id, qty: 1 }], "pickup")).subtotal);

await db.exec(`update public.products set promo_price = 5000 where id = '${loupe.id}'`);
assert.equal(await priceOf(loupe.id), 5000);
await db.exec(`update public.products set promo_starts_at = now() + interval '2 days' where id = '${loupe.id}'`);
assert.equal(await priceOf(loupe.id), 7000);
await db.exec(`update public.products set promo_starts_at = now() - interval '3 days', promo_ends_at = now() - interval '1 day' where id = '${loupe.id}'`);
assert.equal(await priceOf(loupe.id), 7000);
await db.exec(`update public.products set promo_ends_at = now() + interval '1 day' where id = '${loupe.id}'`);
assert.equal(await priceOf(loupe.id), 5000);
console.log("promo : appliquée en cours (5 000), ignorée si programmée ou terminée (7 000) : OK");

await assert.rejects(db.exec(`update public.products set promo_price = 9000 where id = '${loupe.id}'`), /products_promo_price_check/);
await assert.rejects(db.exec(`update public.products set promo_starts_at = now(), promo_ends_at = now() - interval '1 day' where id = '${loupe.id}'`), /products_promo_dates_check/);
console.log("contraintes : prix promo ≥ prix refusé, fin avant début refusée : OK");

await db.exec(`update public.products set price = 0, promo_price = null, promo_starts_at = null, promo_ends_at = null where id = '${loupe.id}'`);
await fail(order([{ product_id: loupe.id, qty: 1 }], "pickup"), "product_unavailable");
console.log("prix à renseigner (0 FCFA) : commande refusée : OK");

// Conversion des anciens prix barrés
const legacy = (await db.query(`insert into public.products (name, slug, price, old_price, stock, images) values ('Ancien', 'ancien-promo', 8000, 10000, 3, '{/photos/x.webp}') returning id`)).rows[0].id;
await load();
const conv = (await db.query("select price, old_price, promo_price from public.products where id = $1", [legacy])).rows[0];
assert.deepEqual([Number(conv.price), conv.old_price, Number(conv.promo_price)], [10000, null, 8000]);
await load();
const conv2 = (await db.query("select price, promo_price from public.products where id = $1", [legacy])).rows[0];
assert.deepEqual([Number(conv2.price), Number(conv2.promo_price)], [10000, 8000]);
console.log("ancien prix barré 10 000 → 8 000 converti en promo, stable au 2e passage : OK");

// L'admin peut gérer les nouveaux champs (GRANT de la table produits)
await as("authenticated", ADMIN, `update public.products set promo_price = 6000, promo_ends_at = now() + interval '7 days', price = 9000 where id = '${legacy}'`);
await assert.rejects(as("authenticated", USER, `update public.products set price = 1 where id = '${legacy}'`).then((r) => { if (r.affectedRows === 0) throw new Error("aucune ligne (RLS)"); }), /aucune ligne|permission/);
console.log("admin : promo modifiable ; non-admin : aucune ligne modifiable (RLS) : OK");
console.log("TESTS ÉTAPE 1 PRODUITS : OK");

// ===================== Étape 2 : catégories (masquage, suppression protégée) =====================
const gad = (await db.query("select c.id as cat, p.id as prod from public.categories c join public.products p on p.category_id = c.id where p.slug = 'mini-batterie-porte-cles'")).rows[0];
const visibleProducts = async (role) => Number((await as(role, role === "anon" ? "" : USER, `select count(*) as n from public.products where id = '${gad.prod}'`)).rows[0].n);
const visibleCat = async (role, uid) => Number((await as(role, uid, `select count(*) as n from public.categories where id = '${gad.cat}'`)).rows[0].n);
assert.equal(await visibleProducts("anon"), 1);
await assert.rejects(as("authenticated", USER, `update public.categories set is_active = false where id = '${gad.cat}'`).then((r) => { if (r.affectedRows === 0) throw new Error("aucune ligne (RLS)"); }), /aucune ligne|permission/);
await as("authenticated", ADMIN, `update public.categories set is_active = false where id = '${gad.cat}'`);
assert.equal(await visibleCat("anon", ""), 0);
assert.equal(await visibleProducts("anon"), 0);
assert.equal(await visibleCat("authenticated", ADMIN), 1);
assert.equal(Number((await as("authenticated", ADMIN, `select count(*) as n from public.products where id = '${gad.prod}'`)).rows[0].n), 1);
await fail(order([{ product_id: gad.prod, qty: 1, storage: "" }], "pickup"), "product_unavailable");
console.log("catégorie masquée : invisible du public avec ses produits, visible de l'admin, commande refusée ; non-admin ne peut pas masquer : OK");
await as("authenticated", ADMIN, `update public.categories set is_active = true where id = '${gad.cat}'`);
assert.equal(await visibleProducts("anon"), 1);

await assert.rejects(as("authenticated", ADMIN, `delete from public.categories where id = '${gad.cat}'`), /foreign key|violates/);
const empty = (await as("authenticated", ADMIN, `insert into public.categories (name, slug, position) values ('Vide', 'vide-test', 99) returning id`)).rows[0].id;
await as("authenticated", ADMIN, `delete from public.categories where id = '${empty}'`);
assert.equal(Number((await db.query("select count(*) as n from public.categories where slug = 'vide-test'")).rows[0].n), 0);
await load();
assert.equal((await db.query("select is_active from public.categories where id = $1", [gad.cat])).rows[0].is_active, true);
console.log("suppression : catégorie avec produits refusée en base, catégorie vide supprimée ; migration rejouable : OK");
console.log("TESTS ÉTAPE 2 CATÉGORIES : OK");

// ===================== Étape 3 : promotions et codes promo =====================
{
  const montre = (await db.query("select p.id, p.price, p.category_id from public.products p where slug = 'montre-connectee-yesido-io22'")).rows[0];
  const basePrice = Number(montre.price); // 25 000
  await db.exec("update public.products set stock = 50 where slug = 'montre-connectee-yesido-io22'");
  const unit = async () => Number((await order([{ product_id: montre.id, qty: 1, color: "", storage: "" }], "pickup")).subtotal);

  // Promotion produit −10 % : 22 500 ; catégorie −3 000 FCFA : 22 000 (meilleur prix) ; tout le site −50 % programmée : ignorée
  const p1 = (await as("authenticated", ADMIN, `insert into public.promotions (name, kind, value, scope, product_id) values ('Montre -10', 'percent', 10, 'product', '${montre.id}') returning id`)).rows[0].id;
  assert.equal(await unit(), Math.round((basePrice * 0.9) / 5) * 5);
  await as("authenticated", ADMIN, `insert into public.promotions (name, kind, value, scope, category_id) values ('Montres -3000', 'amount', 3000, 'category', '${montre.category_id}')`);
  assert.equal(await unit(), basePrice - 3000);
  await as("authenticated", ADMIN, `insert into public.promotions (name, kind, value, scope, starts_at) values ('Soldes', 'percent', 50, 'all', now() + interval '1 day')`);
  assert.equal(await unit(), basePrice - 3000);
  console.log("promotions : produit −10 %, catégorie −3 000 (meilleur prix retenu), programmée ignorée : OK");

  // Une promo terminée ou désactivée ne compte plus ; contraintes
  await db.exec("update public.promotions set is_active = false where name = 'Montres -3000'");
  assert.equal(await unit(), Math.round((basePrice * 0.9) / 5) * 5);
  await db.exec(`update public.promotions set ends_at = now() - interval '1 hour', starts_at = now() - interval '2 days' where id = '${p1}'`);
  assert.equal(await unit(), basePrice);
  await assert.rejects(db.exec("insert into public.promotions (name, kind, value, scope) values ('Trop', 'percent', 95, 'all')"), /promotions_percent_check/);
  await assert.rejects(db.exec("insert into public.promotions (name, kind, value, scope) values ('Sans cible', 'percent', 10, 'product')"), /promotions_target_check/);
  // Remise plus grande que le prix : ignorée (jamais de prix nul)
  await db.exec(`insert into public.promotions (name, kind, value, scope, product_id) values ('Énorme', 'amount', 999999, 'product', '${montre.id}')`);
  assert.equal(await unit(), basePrice);
  await db.exec("delete from public.promotions");
  console.log("promotions : terminée / désactivée ignorée, % > 90 refusé, cible obligatoire, remise ≥ prix ignorée : OK");

  // Lecture publique : promotions actives seulement ; codes promo jamais lisibles
  await db.exec("insert into public.promotions (name, kind, value, scope, is_active) values ('Visible', 'percent', 5, 'all', true), ('Cachée', 'percent', 5, 'all', false)");
  assert.deepEqual((await as("anon", "", "select name from public.promotions order by name")).rows.map((r) => r.name), ["Visible"]);
  await assert.rejects(as("anon", "", "insert into public.promotions (name, kind, value, scope) values ('Pirate', 'percent', 50, 'all')"), /permission denied|row-level/);
  await assert.rejects(as("authenticated", USER, "insert into public.promotions (name, kind, value, scope) values ('Pirate', 'percent', 50, 'all')"), /row-level|permission/);
  await db.exec("delete from public.promotions");

  await db.exec("insert into public.promo_codes (code, kind, value, min_order, max_uses) values ('BIENVENUE10', 'percent', 10, 20000, 2), ('MOINS2000', 'amount', 2000, 0, null)");
  await assert.rejects(as("anon", "", "select * from public.promo_codes"), /permission denied/);
  assert.equal((await as("authenticated", USER, "select * from public.promo_codes")).rows.length, 0);
  await assert.rejects(as("anon", "", "select public.check_promo_code('BIENVENUE10')"), /permission denied/);
  console.log("sécurité : promotions actives lisibles, écriture admin seule ; codes et vérification invisibles du public : OK");

  // Codes promo dans place_order
  const withCode = (code, qty = 1) => {
    const customer = { name: "Client Test", phone: "76123456", zone_id: "bamako-commune-1", city: "Bamako", address: "Rue test, porte 12", promo_code: code };
    return db
      .query("select * from public.place_order($1::jsonb, $2::jsonb, 'pickup', 'cod')", [JSON.stringify(customer), JSON.stringify([{ product_id: montre.id, qty, color: "", storage: "" }])])
      .then(async (r) => (await db.query("select number, subtotal, discount, total, promo_code, status from public.orders where id = $1", [r.rows[0].order_id])).rows[0]);
  };
  const c1 = await withCode(" bienvenue10 ");
  assert.deepEqual([Number(c1.subtotal), Number(c1.discount), Number(c1.total), c1.promo_code], [basePrice, basePrice * 0.1, basePrice * 0.9, "BIENVENUE10"]);
  const c2 = await withCode("MOINS2000");
  assert.deepEqual([Number(c2.discount), Number(c2.total)], [2000, basePrice - 2000]);
  console.log(`code BIENVENUE10 : −10 % (${c1.total}), MOINS2000 : −2 000 : OK`);

  await fail(withCode("INCONNU"), "promo_code_invalid");
  await fail(
    db.query("select * from public.place_order($1::jsonb, $2::jsonb, 'pickup', 'cod')", [
      JSON.stringify({ name: "Client Test", phone: "76123456", city: "", address: "", promo_code: "BIENVENUE10" }),
      JSON.stringify([{ product_id: (await db.query("select id from public.products where slug like 'station%'")).rows[0].id, qty: 1 }]),
    ]),
    "promo_code_min_order",
  );
  await withCode("BIENVENUE10"); // 2e utilisation
  await fail(withCode("BIENVENUE10"), "promo_code_used_up");
  assert.equal((await db.query("select public.check_promo_code('bienvenue10') as r")).rows[0].r.reason, "used_up");
  // Annuler une commande rend l'utilisation
  await db.exec(`update public.orders set status = 'annulee' where number = '${c1.number}'`);
  assert.equal((await db.query("select public.check_promo_code('BIENVENUE10') as r")).rows[0].r.ok, true);
  await withCode("BIENVENUE10");
  await db.exec("update public.promo_codes set expires_at = now() - interval '1 minute' where code = 'MOINS2000'");
  await fail(withCode("MOINS2000"), "promo_code_expired");
  await db.exec("update public.promo_codes set is_active = false where code = 'BIENVENUE10'");
  await fail(withCode("BIENVENUE10"), "promo_code_invalid");
  console.log("codes : inconnu, minimum non atteint, épuisé, expiré, désactivé refusés ; annulation = utilisation rendue : OK");

  // Sans code : discount 0, total inchangé
  const plain = await order([{ product_id: montre.id, qty: 1, color: "", storage: "" }], "pickup");
  assert.equal(Number(plain.total), basePrice);
  await load();
  console.log("migration rejouable avec promotions et codes : OK");
  console.log("TESTS ÉTAPE 3 PROMOTIONS : OK");
}

// ===================== Étape 4 : stock (seuil, historique) =====================
{
  assert.equal((await db.query("select value from public.settings where key = 'stock'")).rows[0].value.low_threshold, 3);
  const st = (await db.query("select id, stock, name from public.products where slug like 'station%'")).rows[0];
  const last = async () => (await db.query("select delta, stock_after, reason, note, actor from public.stock_movements where product_id = $1 order by id desc limit 1", [st.id])).rows[0];

  // Ajustement par l'admin, avec motif (fonction admin_set_stock)
  const adminClaims = JSON.stringify({ role: "authenticated", email: "admin@test.ml", sub: ADMIN });
  const asAdminClaims = async (q) => {
    await db.exec(`set role authenticated; select set_config('test.uid', '${ADMIN}', false); select set_config('request.jwt.claims', '${adminClaims}', false);`);
    try { return await db.query(q); } finally { await db.exec(`reset role; select set_config('test.uid', '${BASE}', false); select set_config('request.jwt.claims', '', false);`); }
  };
  await asAdminClaims(`select public.admin_set_stock('${st.id}', ${st.stock + 4}, 'Arrivage du lundi')`);
  let m = await last();
  assert.deepEqual([m.delta, m.stock_after, m.reason, m.note, m.actor], [4, st.stock + 4, "ajustement", "Arrivage du lundi", "admin@test.ml"]);
  // Modification directe (liste des produits) : ajustement sans motif
  await asAdminClaims(`update public.products set stock = stock - 1 where id = '${st.id}'`);
  m = await last();
  assert.deepEqual([m.delta, m.reason, m.note], [-1, "ajustement", null]);
  console.log("ajustement admin : motif et e-mail enregistrés ; modification directe sans motif : OK");

  // Non-admin : refusé ; historique illisible pour le public et les non-admins ; jamais modifiable
  await assert.rejects(as("authenticated", USER, `select public.admin_set_stock('${st.id}', 99, 'pirate')`), /forbidden/);
  await assert.rejects(as("anon", "", `select public.admin_set_stock('${st.id}', 99, 'pirate')`), /permission denied/);
  await assert.rejects(as("anon", "", "select * from public.stock_movements"), /permission denied/);
  assert.equal((await as("authenticated", USER, "select * from public.stock_movements")).rows.length, 0);
  assert.ok((await as("authenticated", ADMIN, "select * from public.stock_movements")).rows.length > 0);
  await assert.rejects(as("authenticated", ADMIN, "delete from public.stock_movements"), /permission denied/);
  await assert.rejects(as("authenticated", ADMIN, "insert into public.stock_movements (product_name, delta, stock_after, reason) values ('x', 1, 1, 'ajustement')"), /permission denied/);
  await assert.rejects(asAdminClaims(`select public.admin_set_stock('${st.id}', -2, null)`), /invalid_stock/);
  console.log("sécurité : non-admin refusé, historique lisible par l'admin seul, jamais modifiable, stock négatif refusé : OK");

  // Vente (requête clé de service) puis annulation et réactivation de la commande
  const before = (await db.query("select stock from public.products where id = $1", [st.id])).rows[0].stock;
  await db.exec(`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
  const sale = await order([{ product_id: st.id, qty: 2, color: "", storage: "" }], "pickup");
  await db.exec("select set_config('request.jwt.claims', '', false)");
  m = await last();
  assert.deepEqual([m.delta, m.stock_after, m.reason, m.actor], [-2, before - 2, "vente", "Commande en ligne"]);
  await asAdminClaims(`update public.orders set status = 'annulee' where number = '${sale.number}'`);
  m = await last();
  assert.deepEqual([m.delta, m.reason, m.actor], [2, "annulation", "admin@test.ml"]);
  await asAdminClaims(`update public.orders set status = 'confirmee' where number = '${sale.number}'`);
  m = await last();
  assert.deepEqual([m.delta, m.reason], [-2, "reprise"]);
  console.log("vente −2 (Commande en ligne), annulation +2 et réactivation −2 (e-mail de l'admin) : OK");

  // Création d'un produit avec du stock
  const np = (await db.query("insert into public.products (name, slug, price, stock, images) values ('Neuf', 'neuf-stock', 1000, 7, '{/photos/x.webp}') returning id")).rows[0].id;
  const c = (await db.query("select delta, reason from public.stock_movements where product_id = $1", [np])).rows[0];
  assert.deepEqual([c.delta, c.reason], [7, "creation"]);
  await db.exec(`delete from public.products where id = '${np}'`);
  assert.equal((await db.query("select product_id from public.stock_movements where product_name = 'Neuf'")).rows[0].product_id, null);
  await load();
  assert.equal((await db.query("select value from public.settings where key = 'stock'")).rows[0].value.low_threshold, 3);
  console.log("création +7 ; produit supprimé : l'historique reste ; migration rejouable : OK");
  console.log("TESTS ÉTAPE 4 STOCK : OK");
}

// ===================== Étape 5 : clients =====================
{
  await db.exec("delete from public.repair_requests");
  await db.exec(`insert into public.repair_requests (customer_name, phone, device, issue, created_at) values ('Awa Traoré', '66554433', 'Tecno Spark 20', 'Écran cassé', now() - interval '1 hour'), ('Client Test (répar.)', '76123456', 'iPhone 11', 'Batterie', now())`);
  const rows = (await as("authenticated", ADMIN, "select * from public.admin_customers(null, 'recent', 50)")).rows;
  const test = rows.find((r) => r.phone === "76123456");
  const expected = (await db.query("select count(*) filter (where status <> 'annulee') as n, coalesce(sum(total) filter (where status <> 'annulee'), 0) as t from public.orders where phone = '76123456'")).rows[0];
  assert.equal(Number(test.orders_count), Number(expected.n));
  assert.equal(Number(test.total_spent), Number(expected.t));
  assert.equal(Number(test.repairs_count), 1);
  assert.equal(test.name, "Client Test (répar.)"); // nom le plus récent
  const awa = rows.find((r) => r.phone === "66554433");
  assert.deepEqual([Number(awa.orders_count), Number(awa.total_spent), Number(awa.repairs_count)], [0, 0, 1]);
  assert.equal(rows[0].phone, "76123456"); // tri par dernière activité
  console.log(`clients : ${rows.length} ; Client Test ${test.orders_count} commandes, ${test.total_spent} FCFA hors annulées, 1 réparation : OK`);

  const byPhone = (await as("authenticated", ADMIN, "select phone from public.admin_customers('+223 66 55', 'recent', 50)")).rows;
  assert.deepEqual(byPhone.map((r) => r.phone), ["66554433"]);
  const byName = (await as("authenticated", ADMIN, "select phone from public.admin_customers('awa', 'recent', 50)")).rows;
  assert.deepEqual(byName.map((r) => r.phone), ["66554433"]);
  const bySpent = (await as("authenticated", ADMIN, "select phone from public.admin_customers(null, 'depenses', 50)")).rows;
  assert.equal(bySpent[0].phone, "76123456");
  console.log("recherche par téléphone (+223 66 55) et par nom, tri par dépenses : OK");

  await assert.rejects(as("authenticated", USER, "select * from public.admin_customers()"), /forbidden/);
  await assert.rejects(as("anon", "", "select * from public.admin_customers()"), /permission denied/);
  await load();
  console.log("sécurité : non-admin refusé, visiteur refusé ; migration rejouable : OK");
  console.log("TESTS ÉTAPE 5 CLIENTS : OK");
}

// ===================== Étape 6 : rôles d'équipe =====================
{
  // L'admin des tests (inséré sans rôle) est devenu propriétaire
  assert.equal((await db.query("select role from public.admins where user_id = $1", [ADMIN])).rows[0].role, "owner");
  const SELLER = "00000000-0000-0000-0000-00000000005e";
  const MANAGER = "00000000-0000-0000-0000-00000000004a";
  await db.query("insert into auth.users (id, email) values ($1, 'vendeur@test'), ($2, 'Gerant2@Test')", [SELLER, MANAGER]);

  // Le propriétaire ajoute un vendeur et un gérant (e-mail insensible à la casse)
  await as("authenticated", ADMIN, "select public.owner_add_member('vendeur@test', 'seller')");
  await as("authenticated", ADMIN, "select public.owner_add_member('gerant2@test', 'manager')");
  await assert.rejects(as("authenticated", ADMIN, "select public.owner_add_member('inconnu@test', 'seller')"), /user_not_found/);
  await assert.rejects(as("authenticated", ADMIN, "select public.owner_add_member('vendeur@test', 'owner')"), /invalid_role/);
  const team = (await as("authenticated", ADMIN, "select email, role, is_me from public.owner_team()")).rows;
  assert.deepEqual(team.map((t) => [t.email, t.role]), [["gerant@test", "owner"], ["Gerant2@Test", "manager"], ["vendeur@test", "seller"]]);
  assert.equal(team[0].is_me, true);
  console.log("équipe : propriétaire, gérant et vendeur ajoutés ; e-mail inconnu et rôle « owner » refusés : OK");

  // Seul le propriétaire gère l'équipe ; jamais un propriétaire
  await assert.rejects(as("authenticated", MANAGER, "select * from public.owner_team()"), /forbidden/);
  await assert.rejects(as("authenticated", MANAGER, `select public.owner_set_role('${SELLER}', 'manager')`), /forbidden/);
  await assert.rejects(as("authenticated", SELLER, `select public.owner_add_member('client@test', 'manager')`), /forbidden/);
  await assert.rejects(as("authenticated", ADMIN, `select public.owner_set_role('${ADMIN}', 'seller')`), /not_found/);
  await assert.rejects(as("authenticated", ADMIN, `select public.owner_remove_member('${ADMIN}')`), /not_found/);
  await assert.rejects(as("anon", "", "select * from public.owner_team()"), /permission denied/);
  await assert.rejects(as("authenticated", SELLER, "insert into public.admins (user_id, role) values ('" + USER + "', 'owner')"), /permission denied|row-level/);
  console.log("gestion d'équipe : gérant, vendeur et visiteur refusés ; un propriétaire ne se modifie pas : OK");

  // Droits du vendeur : commandes, réparations, stock ; rien d'autre
  const ord = (await db.query("select id, status from public.orders where status <> 'annulee' order by created_at desc limit 1")).rows[0];
  assert.ok((await as("authenticated", SELLER, "select count(*) as n from public.orders")).rows[0].n > 0);
  const upd = await as("authenticated", SELLER, `update public.orders set status = 'confirmee' where id = '${ord.id}'`);
  assert.equal(upd.affectedRows, 1);
  await assert.rejects(as("authenticated", SELLER, `update public.orders set total = 1 where id = '${ord.id}'`), /permission denied/);
  assert.ok((await as("authenticated", SELLER, "select count(*) as n from public.repair_requests")).rows[0].n > 0);
  assert.ok((await as("authenticated", SELLER, "select count(*) as n from public.stock_movements")).rows[0].n > 0);
  const hidden = (await as("authenticated", SELLER, "select count(*) as n from public.products where not is_active")).rows[0].n;
  assert.equal(Number(hidden), Number((await db.query("select count(*) as n from public.products where not is_active")).rows[0].n));
  const st = (await db.query("select id, stock from public.products where slug like 'station%'")).rows[0];
  await as("authenticated", SELLER, `select public.admin_set_stock('${st.id}', ${st.stock + 1}, 'Vendeur')`);
  assert.equal((await db.query("select stock from public.products where id = $1", [st.id])).rows[0].stock, st.stock + 1);
  console.log("vendeur : lit et fait avancer les commandes (jamais les montants), lit réparations et historique, ajuste le stock : OK");

  const denied = async (q) => {
    const r = await as("authenticated", SELLER, q).catch((e) => e);
    assert.ok(r instanceof Error || r.affectedRows === 0, `doit être refusé : ${q}`);
  };
  await denied(`update public.products set price = 1 where id = '${st.id}'`);
  await denied(`update public.products set stock = 999 where id = '${st.id}'`);
  await denied("update public.settings set value = '{}'::jsonb where key = 'store'");
  await denied("insert into public.promotions (name, kind, value, scope) values ('x', 'percent', 50, 'all')");
  await denied("select * from public.promo_codes");
  await assert.rejects(as("authenticated", SELLER, "select public.admin_dashboard_stats()"), /forbidden/);
  await assert.rejects(as("authenticated", SELLER, "select * from public.admin_customers()"), /forbidden/);
  assert.equal((await as("authenticated", SELLER, "select public.staff_role() as r")).rows[0].r, "seller");
  assert.equal((await as("authenticated", SELLER, "select public.is_admin() as r")).rows[0].r, false);
  console.log("vendeur : prix, stock direct, réglages, promotions, codes, statistiques et clients refusés : OK");

  // Le gérant fait tout sauf l'équipe ; changement de rôle et retrait
  await as("authenticated", MANAGER, "select public.admin_dashboard_stats()");
  assert.equal((await as("authenticated", MANAGER, `update public.products set price = price where id = '${st.id}'`)).affectedRows, 1);
  await as("authenticated", ADMIN, `select public.owner_set_role('${SELLER}', 'manager')`);
  assert.equal((await as("authenticated", SELLER, "select public.is_admin() as r")).rows[0].r, true);
  await as("authenticated", ADMIN, `select public.owner_remove_member('${SELLER}')`);
  assert.equal((await as("authenticated", SELLER, "select public.is_staff() as r")).rows[0].r, false);
  await load();
  assert.equal((await db.query("select role from public.admins where user_id = $1", [MANAGER])).rows[0].role, "manager");
  console.log("gérant : accès complet hors équipe ; rôle changé puis retiré ; migration rejouable : OK");
  console.log("TESTS ÉTAPE 6 ÉQUIPE : OK");
}

// ===================== Étape 7 : journal d'activité =====================
{
  const claims = (uid, email) => JSON.stringify({ role: "authenticated", email, sub: uid });
  const asWith = async (uid, email, q) => {
    await db.exec(`set role authenticated; select set_config('test.uid', '${uid}', false); select set_config('request.jwt.claims', '${claims(uid, email)}', false);`);
    try { return await db.query(q); } finally { await db.exec(`reset role; select set_config('test.uid', '${BASE}', false); select set_config('request.jwt.claims', '', false);`); }
  };
  await db.exec("delete from public.activity_log");
  const st = (await db.query("select id, price, stock, name from public.products where slug like 'station%'")).rows[0];
  await asWith(ADMIN, "gerant@test", `update public.products set price = ${Number(st.price) + 500}, images = '{/photos/y.webp}' where id = '${st.id}'`);
  let log = (await db.query("select * from public.activity_log order by id desc limit 1")).rows[0];
  assert.deepEqual([log.actor_email, log.action, log.entity, log.label], ["gerant@test", "modification", "produit", st.name]);
  assert.deepEqual(log.changes.price.map(Number), [Number(st.price), Number(st.price) + 500]);
  assert.deepEqual(log.changes.images, ["…", "…"]);
  assert.equal(log.changes.updated_at, undefined);
  console.log("modification d'un produit : auteur, prix avant → après, photos « modifiées » : OK");

  // Ordre d'affichage seul : rien ; vente (clé de service) : rien ; SQL Editor : rien
  const n0 = Number((await db.query("select count(*) as n from public.activity_log")).rows[0].n);
  const cat = (await db.query("select id from public.categories limit 1")).rows[0].id;
  await asWith(ADMIN, "gerant@test", `update public.categories set position = position + 1 where id = '${cat}'`);
  await db.exec(`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
  await order([{ product_id: st.id, qty: 1, color: "", storage: "" }], "pickup");
  await db.exec("select set_config('request.jwt.claims', '', false)");
  await db.exec(`update public.products set stock = stock + 1 where id = '${st.id}'`);
  assert.equal(Number((await db.query("select count(*) as n from public.activity_log")).rows[0].n), n0);
  console.log("non journalisé : ordre d'affichage, vente du site, SQL Editor : OK");

  // Ajout, statut de commande, suppression, équipe
  await asWith(ADMIN, "gerant@test", "insert into public.promo_codes (code, kind, value) values ('JOURNAL5', 'percent', 5)");
  await asWith(ADMIN, "gerant@test", "delete from public.promo_codes where code = 'JOURNAL5'");
  const ord = (await db.query("select id, number from public.orders where status = 'confirmee' limit 1")).rows[0];
  await asWith(ADMIN, "gerant@test", `update public.orders set status = 'expediee' where id = '${ord.id}'`);
  const rows = (await db.query("select action, entity, label, changes from public.activity_log order by id desc limit 3")).rows;
  assert.deepEqual(rows.map((r) => [r.action, r.entity, r.label]), [["modification", "commande", ord.number], ["suppression", "code promo", "JOURNAL5"], ["ajout", "code promo", "JOURNAL5"]]);
  assert.deepEqual(rows[0].changes.status, ["confirmee", "expediee"]);
  console.log("ajout et suppression d'un code, statut de commande : OK");

  // Lecture : propriétaire seul ; jamais modifiable
  const MANAGER = "00000000-0000-0000-0000-00000000004a";
  assert.ok((await as("authenticated", ADMIN, "select count(*) as n from public.activity_log")).rows[0].n > 0);
  assert.equal(Number((await as("authenticated", MANAGER, "select count(*) as n from public.activity_log")).rows[0].n), 0);
  await assert.rejects(as("anon", "", "select * from public.activity_log"), /permission denied/);
  await assert.rejects(as("authenticated", ADMIN, "delete from public.activity_log"), /permission denied/);
  await load();
  console.log("journal : lisible par le propriétaire seul, jamais modifiable ; migration rejouable : OK");
  console.log("TESTS ÉTAPE 7 JOURNAL : OK");
}

// ===================== Codes promo : limite d'essais =====================
{
  await db.exec("delete from public.promo_code_attempts; delete from public.promo_codes where code = 'LIMITE10'");
  await db.exec("insert into public.promo_codes (code, kind, value) values ('LIMITE10', 'percent', 10)");
  const A = "a".repeat(64), B = "b".repeat(64);
  const check = async (code, client) => (await db.query("select public.check_promo_code($1, $2) as r", [code, client])).rows[0].r;

  for (let i = 0; i < 5; i++) assert.equal((await check("LIMITE10", A)).ok, true); // les bons codes ne comptent pas
  for (let i = 0; i < 10; i++) assert.equal((await check(`FAUX${i}`, A)).reason, "invalid");
  assert.equal((await check("FAUX99", A)).reason, "too_many_attempts");
  assert.equal((await check("LIMITE10", A)).reason, "too_many_attempts"); // bloqué, même avec le bon code
  assert.equal((await check("LIMITE10", B)).ok, true); // un autre visiteur n'est pas touché
  assert.equal(Number((await db.query("select count(*) as n from public.promo_code_attempts where client = $1", [A])).rows[0].n), 10);
  console.log("limite : 10 essais ratés par heure, bons codes non comptés, autre visiteur libre : OK");

  await db.exec(`update public.promo_code_attempts set created_at = now() - interval '61 minutes' where client = '${A}'`);
  assert.equal((await check("LIMITE10", A)).ok, true);
  await db.exec(`update public.promo_code_attempts set created_at = now() - interval '2 days' where client = '${A}'`);
  await check("FAUX", B);
  assert.equal(Number((await db.query("select count(*) as n from public.promo_code_attempts where client = $1", [A])).rows[0].n), 0);
  console.log("après une heure : de nouveau permis ; lignes de plus d'un jour effacées : OK");

  await assert.rejects(as("anon", "", "select * from public.promo_code_attempts"), /permission denied/);
  await assert.rejects(as("authenticated", ADMIN, "select * from public.promo_code_attempts"), /permission denied/);
  await assert.rejects(as("anon", "", "select public.check_promo_code('LIMITE10', 'x')"), /permission denied/);
  assert.equal((await db.query("select public.check_promo_code('LIMITE10') as r")).rows[0].r.ok, true); // sans client : pas de limite
  await load();
  console.log("table et fonction invisibles du public et de l'admin ; migration rejouable : OK");
  console.log("TESTS LIMITE CODES PROMO : OK");
}

// ===================== Comptes clients =====================
{
  const AMINATA = "00000000-0000-0000-0000-0000000000a1";
  const MOUSSA = "00000000-0000-0000-0000-0000000000b2";
  const NOUVEAU = "00000000-0000-0000-0000-0000000000d3";
  // Inscription e-mail (métadonnées nom, téléphone, CGV) et Google (nom seulement)
  await db.query(
    "insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values ($1, 'aminata@exemple.ml', now(), $2, '{\"provider\":\"email\"}')",
    [AMINATA, JSON.stringify({ full_name: "Aminata Coulibaly", phone: "+223 66 11 22 33", cgv_accepted: true })],
  );
  await db.query(
    "insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data) values ($1, 'moussa@gmail.com', now(), $2, '{\"provider\":\"google\"}')",
    [MOUSSA, JSON.stringify({ name: "Moussa Keïta", email_verified: true })],
  );
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'pas.confirme@exemple.ml', '{\"full_name\":\"Pas Confirmé\"}')", [NOUVEAU]);
  const prof = async (id) => (await db.query("select full_name, phone, cgv_accepted_at from public.profiles where id = $1", [id])).rows[0];
  const pa = await prof(AMINATA);
  assert.deepEqual([pa.full_name, pa.phone, pa.cgv_accepted_at !== null], ["Aminata Coulibaly", "66112233", true]);
  const pm = await prof(MOUSSA);
  assert.deepEqual([pm.full_name, pm.phone, pm.cgv_accepted_at], ["Moussa Keïta", null, null]);
  console.log("déclencheur : profil créé pour un compte e-mail (nom, téléphone, CGV) et un compte Google (nom, téléphone à demander) : OK");

  // Commandes : visiteur refusé, compte non confirmé refusé, client confirmé accepté et rattaché
  const watch = (await db.query("select id from public.products where slug = 'montre-connectee-yesido-io22'")).rows[0].id;
  await db.exec("update public.products set stock = 50 where slug = 'montre-connectee-yesido-io22'");
  const customer = JSON.stringify({ name: "Aminata Coulibaly", phone: "66112233", city: "", address: "" });
  const items = JSON.stringify([{ product_id: watch, qty: 1, color: "", storage: "" }]);
  const placeAs = (role, uid) => as(role, uid, `select * from public.place_order('${customer}'::jsonb, '${items}'::jsonb, 'pickup', 'cod')`);
  await assert.rejects(placeAs("anon", ""), /permission denied/);
  await assert.rejects(as("authenticated", "", `select * from public.place_order('${customer}'::jsonb, '${items}'::jsonb, 'pickup', 'cod')`).catch(async (e) => { throw e; }).then(async (r) => r), /not_authenticated/);
  await assert.rejects(placeAs("authenticated", NOUVEAU), /email_not_confirmed/);
  await assert.rejects(placeAs("service_role", ""), /permission denied/);
  const oa = (await placeAs("authenticated", AMINATA)).rows[0];
  const om = (await placeAs("authenticated", MOUSSA)).rows[0];
  assert.equal((await db.query("select user_id from public.orders where id = $1", [oa.order_id])).rows[0].user_id, AMINATA);
  console.log("place_order : visiteur (clé publique) et clé de service refusés, compte non confirmé refusé, client rattaché à sa commande : OK");

  // Prix toujours relus en base (le navigateur n'envoie pas de prix)
  const tricky = JSON.stringify([{ product_id: watch, qty: 1, color: "", storage: "", price: 1 }]);
  const ot = (await as("authenticated", AMINATA, `select * from public.place_order('${customer}'::jsonb, '${tricky}'::jsonb, 'pickup', 'cod')`)).rows[0];
  assert.equal(Number(ot.order_total), Number((await db.query("select price from public.products where id = $1", [watch])).rows[0].price));
  console.log("prix relu en base, prix envoyé ignoré : OK");

  // Lecture : chacun ses commandes ; jamais celles des autres ; aucune modification
  const mine = (await as("authenticated", AMINATA, "select id, user_id from public.orders")).rows;
  assert.ok(mine.length === 2 && mine.every((o) => o.user_id === AMINATA));
  assert.equal((await as("authenticated", MOUSSA, `select count(*) as n from public.orders where id = '${oa.order_id}'`)).rows[0].n, 0);
  assert.equal((await as("authenticated", AMINATA, `update public.orders set status = 'livree' where id = '${oa.order_id}'`)).affectedRows, 0);
  await assert.rejects(as("authenticated", AMINATA, `update public.orders set total = 1 where id = '${oa.order_id}'`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, `delete from public.orders where id = '${oa.order_id}'`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, "select * from public.order_status_history"), /./).catch(() => {}); // lecture directe : aucune ligne
  assert.equal((await as("authenticated", AMINATA, "select count(*) as n from public.order_status_history")).rows[0].n, 0);
  const hist = (await as("authenticated", AMINATA, `select * from public.my_order_history('${oa.order_id}')`)).rows;
  assert.equal(hist.length, 1);
  assert.equal(hist[0].changed_by_email, undefined);
  assert.equal((await as("authenticated", MOUSSA, `select count(*) as n from public.my_order_history('${oa.order_id}')`)).rows[0].n, 0);
  console.log("RLS : un client ne voit que ses commandes, ne change ni statut ni montant, suit son historique sans e-mail de l'équipe : OK");

  // Réparations : rattachées au compte, notes internes jamais visibles
  const rep = (await db.query("select * from public.create_repair_request($1::jsonb)", [JSON.stringify({ name: "Aminata", phone: "66112233", device: "Tecno Spark", issue: "Écran", user_id: AMINATA })])).rows[0];
  await db.query("update public.repair_requests set internal_notes = 'Client difficile' where id = $1", [rep.request_id]);
  const myRep = (await as("authenticated", AMINATA, "select * from public.my_repairs()")).rows;
  assert.equal(myRep.length, 1);
  assert.equal(myRep[0].internal_notes, undefined);
  assert.equal((await as("authenticated", AMINATA, "select count(*) as n from public.repair_requests")).rows[0].n, 0);
  assert.equal((await as("authenticated", MOUSSA, "select count(*) as n from public.my_repairs()")).rows[0].n, 0);
  const anonRep = (await db.query("select * from public.create_repair_request($1::jsonb)", [JSON.stringify({ name: "Sans compte", phone: "79000011", device: "Itel", issue: "Batterie" })])).rows[0];
  assert.equal((await db.query("select user_id from public.repair_requests where id = $1", [anonRep.request_id])).rows[0].user_id, null);
  console.log("réparations : rattachées au compte connecté, possibles sans compte, notes internes invisibles : OK");

  // Profil : chacun le sien ; ni rôle, ni admins, ni identifiant
  await as("authenticated", AMINATA, "update public.profiles set phone = '66112244', city = 'Bamako', address = 'Rue 10', zone_id = 'bamako-commune-1' where id = auth.uid()");
  assert.equal((await prof(AMINATA)).phone, "66112244");
  assert.equal((await as("authenticated", AMINATA, `update public.profiles set full_name = 'Pirate' where id = '${MOUSSA}'`)).affectedRows, 0);
  assert.equal((await as("authenticated", AMINATA, "select count(*) as n from public.profiles")).rows[0].n, 1);
  await assert.rejects(as("authenticated", AMINATA, `update public.profiles set id = '${MOUSSA}' where id = auth.uid()`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, `insert into public.profiles (id) values ('${NOUVEAU}')`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, `insert into public.admins (user_id, role) values ('${AMINATA}', 'owner')`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, `update public.admins set role = 'owner'`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, `select public.owner_add_member('aminata@exemple.ml', 'manager')`), /forbidden/);
  for (const f of ["is_staff", "is_admin", "is_owner"]) assert.equal((await as("authenticated", AMINATA, `select public.${f}() as r`)).rows[0].r, false);
  assert.equal((await as("authenticated", AMINATA, "select public.staff_role() as r")).rows[0].r, null);
  await assert.rejects(as("authenticated", AMINATA, "select public.admin_dashboard_stats()"), /forbidden/);
  await assert.rejects(as("authenticated", AMINATA, "select * from public.admin_customer_accounts()"), /forbidden/);
  assert.equal((await as("authenticated", AMINATA, "select count(*) as n from public.promo_codes")).rows[0].n, 0);
  assert.equal((await as("authenticated", AMINATA, "select count(*) as n from public.stock_movements")).rows[0].n, 0);
  console.log("profil : le sien seulement ; jamais d'accès à admins, aux rôles ni aux écrans de l'équipe : OK");

  // Journaux : une commande de client n'est ni une action d'équipe, ni un ajustement
  assert.equal(Number((await db.query("select count(*) as n from public.activity_log where actor_email = 'aminata@exemple.ml'")).rows[0].n), 0);
  const mv = (await db.query("select reason, actor from public.stock_movements where product_name like 'Montre%' order by id desc limit 1")).rows[0];
  assert.deepEqual([mv.reason, mv.actor], ["vente", "Commande en ligne"]);
  console.log("journaux : commande d'un client = vente, jamais dans le journal de l'équipe : OK");

  // Admin : comptes clients, sans l'équipe
  const accounts = (await as("authenticated", ADMIN, "select * from public.admin_customer_accounts()")).rows;
  const emails = accounts.map((a) => a.email);
  assert.ok(emails.includes("aminata@exemple.ml") && emails.includes("moussa@gmail.com"));
  assert.ok(!emails.includes("gerant@test"));
  const am = accounts.find((a) => a.email === "aminata@exemple.ml");
  assert.deepEqual([Number(am.orders_count), am.provider, am.email_confirmed], [2, "email", true]);
  assert.equal(accounts.find((a) => a.email === "moussa@gmail.com").provider, "google");
  assert.equal((await as("authenticated", ADMIN, "select count(*) as n from public.admin_customer_accounts('66 11 22')")).rows[0].n, 1);
  console.log("admin : comptes clients (sans l'équipe), commandes et total, recherche par téléphone : OK");

  // Limites anti-robots
  const C = "c".repeat(64);
  for (let i = 0; i < 5; i++) {
    assert.equal((await db.query("select public.rate_limit_allowed('signup', $1, 5) as ok", [C])).rows[0].ok, true);
    await db.query("select public.rate_limit_hit('signup', $1)", [C]);
  }
  assert.equal((await db.query("select public.rate_limit_allowed('signup', $1, 5) as ok", [C])).rows[0].ok, false);
  assert.equal((await db.query("select public.rate_limit_allowed('login', $1, 5) as ok", [C])).rows[0].ok, true);
  await assert.rejects(as("anon", "", `select public.rate_limit_hit('login', '${C}')`), /permission denied/);
  await assert.rejects(as("authenticated", AMINATA, "select * from public.rate_limit_hits"), /permission denied/);
  console.log("limites : 5 inscriptions par heure et par visiteur, compteurs séparés, invisibles du public : OK");

  // Suppression du compte : profil effacé, commandes gardées sans lien
  await db.query("delete from auth.users where id = $1", [MOUSSA]);
  assert.equal(await prof(MOUSSA), undefined);
  assert.equal((await db.query("select user_id from public.orders where id = $1", [om.order_id])).rows[0].user_id, null);
  await load();
  assert.equal((await prof(AMINATA)).phone, "66112244");
  console.log("suppression du compte : profil effacé, commandes conservées sans lien ; migration rejouable : OK");
  console.log("TESTS COMPTES CLIENTS : OK");
}

// ===================== Avis produits =====================
{
  const A = "00000000-0000-0000-0000-0000000000a1"; // Aminata (compte client, commandes)
  const Z = "00000000-0000-0000-0000-0000000000e9";
  await db.query("insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values ($1, 'zoe@exemple.ml', now(), '{\"full_name\":\"Zoé Traoré\"}')", [Z]);
  const watch = (await db.query("select id from public.products where slug = 'montre-connectee-yesido-io22'")).rows[0].id;
  const loupe = (await db.query("select id from public.products where slug = 'loupe-ecran'")).rows[0].id;
  const insertAs = (uid, product, extra = "") =>
    as("authenticated", uid, `insert into public.product_reviews (product_id, rating, title, body, recommends${extra ? ", photos" : ""}) values ('${product}', 5, '<b>Super</b> montre', 'Très <script>alert(1)</script>bonne montre, je recommande.', true${extra}) returning id`);

  // Visiteur : ni écriture ni lecture d'un avis en attente
  await assert.rejects(as("anon", "", `insert into public.product_reviews (product_id, rating, body) values ('${watch}', 5, 'Avis de visiteur anonyme')`), /permission denied/);
  const ra = (await insertAs(A, watch)).rows[0].id;
  const row = (await db.query("select * from public.product_reviews where id = $1", [ra])).rows[0];
  assert.deepEqual([row.status, row.title, row.body, row.author_name], ["pending", "Super montre", "Très alert(1)bonne montre, je recommande.", "Aminata C."]);
  console.log("avis : connecté seulement, « En attente », HTML retiré, nom affiché « Aminata C. » : OK");

  // Achat vérifié : commande livrée contenant le produit
  assert.equal(row.verified_purchase, false);
  const ord = (await db.query("select id from public.orders where user_id = $1 and items @> $2::jsonb limit 1", [A, JSON.stringify([{ product_id: watch }])])).rows[0].id;
  await db.query("update public.orders set status = 'livree' where id = $1", [ord]);
  await as("authenticated", A, `update public.product_reviews set rating = 4 where id = '${ra}'`);
  assert.equal((await db.query("select verified_purchase from public.product_reviews where id = $1", [ra])).rows[0].verified_purchase, true);
  const rz = (await insertAs(Z, watch)).rows[0].id;
  assert.equal((await db.query("select verified_purchase from public.product_reviews where id = $1", [rz])).rows[0].verified_purchase, false);
  console.log("achat vérifié : oui après une commande livrée ; avis permis sans achat, sans badge : OK");

  // Un seul avis par produit ; jamais valider le sien ; jamais toucher à celui d'un autre
  await assert.rejects(insertAs(A, watch), /duplicate key|unique/);
  await assert.rejects(as("authenticated", A, `update public.product_reviews set status = 'published' where id = '${ra}'`), /permission denied/);
  await assert.rejects(as("authenticated", A, `select public.admin_moderate_product_review('${ra}', 'publish')`), /forbidden/);
  assert.equal((await as("authenticated", A, `update public.product_reviews set rating = 1 where id = '${rz}'`)).affectedRows, 0);
  assert.equal((await as("authenticated", A, `delete from public.product_reviews where id = '${rz}'`)).affectedRows, 0);
  await assert.rejects(as("authenticated", A, `insert into public.product_reviews (product_id, rating, body, user_id) values ('${loupe}', 5, 'Je me fais passer pour un autre', '${Z}')`), /permission denied/);
  console.log("règles : un avis par produit, jamais valider le sien, jamais modifier ni supprimer celui d'un autre : OK");

  // Lecture : publiés + les siens ; en attente et refusés jamais publics
  assert.equal((await as("anon", "", "select count(*) as n from public.product_reviews")).rows[0].n, 0);
  assert.equal((await as("authenticated", Z, "select count(*) as n from public.product_reviews")).rows[0].n, 1); // le sien seulement
  await assert.rejects(as("anon", "", "select user_id from public.product_reviews"), /permission denied/);
  await assert.rejects(as("authenticated", A, "select report_count from public.product_reviews"), /permission denied/);
  await as("authenticated", ADMIN, `select public.admin_moderate_product_review('${ra}', 'publish')`);
  await as("authenticated", ADMIN, `select public.admin_moderate_product_review('${rz}', 'reject', 'Hors sujet')`);
  await assert.rejects(as("authenticated", ADMIN, `select public.admin_moderate_product_review('${rz}', 'reject', '')`), /reason_required/);
  assert.deepEqual((await as("anon", "", "select id from public.product_reviews")).rows.map((r) => r.id), [ra]);
  assert.equal((await as("authenticated", A, `select count(*) as n from public.product_reviews where id = '${rz}'`)).rows[0].n, 0);
  const mine = (await as("authenticated", Z, "select status, reject_reason from public.my_product_reviews()")).rows[0];
  assert.deepEqual([mine.status, mine.reject_reason], ["rejected", "Hors sujet"]);
  console.log("lecture : public = publiés seulement ; refusé visible de son auteur seul, avec le motif : OK");

  // Réponse de la boutique, statistiques, modification → nouvelle relecture
  await as("authenticated", ADMIN, `select public.admin_moderate_product_review('${ra}', 'reply', 'Merci Aminata !')`);
  assert.equal((await as("anon", "", `select reply from public.product_reviews where id = '${ra}'`)).rows[0].reply, "Merci Aminata !");
  const stats = (await as("anon", "", `select * from public.product_rating_stats() where product_id = '${watch}'`)).rows[0];
  assert.deepEqual([stats.reviews, Number(stats.average), stats.recommend_pct], [1, 4, 100]);
  await as("authenticated", A, `update public.product_reviews set body = 'Finalement moyenne, bracelet fragile.', recommends = false where id = '${ra}'`);
  assert.equal((await db.query("select status from public.product_reviews where id = $1", [ra])).rows[0].status, "pending");
  assert.equal((await as("anon", "", "select count(*) as n from public.product_rating_stats()")).rows[0].n, 0);
  await as("authenticated", ADMIN, `select public.admin_moderate_product_review('${ra}', 'publish')`);
  console.log("réponse publique, moyenne et % de recommandation, modification = nouvelle relecture : OK");

  // Photos : seulement depuis son propre dossier ; 3 au plus
  const base = "https://x.supabase.co/storage/v1/object/public/catalog/reviews/";
  await assert.rejects(insertAs(Z, loupe, `, array['${base}${A}/a.webp']`), /invalid_photo/);
  await insertAs(Z, loupe, `, array['${base}${Z}/a.webp']`);
  await assert.rejects(as("authenticated", Z, `update public.product_reviews set photos = array['${base}${Z}/1.webp','${base}${Z}/2.webp','${base}${Z}/3.webp','${base}${Z}/4.webp'] where product_id = '${loupe}'`), /check|cardinality/);
  console.log("photos : dossier du client seulement, 3 au plus : OK");

  // Limite : 5 nouveaux avis par heure
  const prods = (await db.query("select id from public.products where id not in ($1, $2) limit 5", [watch, loupe])).rows.map((r) => r.id);
  await db.exec(`update public.product_reviews set created_at = now() - interval '2 hours' where user_id = '${Z}'`);
  for (const p of prods.slice(0, 5)) await insertAs(Z, p);
  await assert.rejects(insertAs(Z, (await db.query("select id from public.products where id not in (select product_id from public.product_reviews where user_id = $1) limit 1", [Z])).rows[0].id), /too_many_reviews/);
  console.log("limite : 5 nouveaux avis par heure et par client : OK");

  // Signalement : une fois par visiteur ; 3 visiteurs → de nouveau « En attente »
  for (const c of ["a", "b", "b"]) await db.query("select public.report_product_review($1, $2)", [ra, c.repeat(64)]);
  assert.equal((await db.query("select report_count, status from public.product_reviews where id = $1", [ra])).rows[0].report_count, 2);
  await db.query("select public.report_product_review($1, $2)", [ra, "c".repeat(64)]);
  assert.equal((await db.query("select status from public.product_reviews where id = $1", [ra])).rows[0].status, "pending");
  await assert.rejects(as("anon", "", `select public.report_product_review('${ra}', '${"d".repeat(64)}')`), /permission denied/);
  console.log("signalement : un par visiteur, 3 signalements → retiré en attente de relecture : OK");

  // Admin : liste et compteur ; vendeur et client refusés ; produits reçus à noter
  assert.ok((await as("authenticated", ADMIN, "select public.admin_pending_reviews_count() as n")).rows[0].n >= 1);
  await assert.rejects(as("authenticated", A, "select * from public.admin_product_reviews()"), /forbidden/);
  const toRate = (await as("authenticated", A, "select * from public.my_reviewable_products()")).rows;
  assert.ok(!toRate.some((r) => r.product_id === watch));
  await as("authenticated", A, `delete from public.product_reviews where id = '${ra}'`);
  assert.ok((await as("authenticated", A, "select * from public.my_reviewable_products()")).rows.some((r) => r.product_id === watch));
  await db.exec(`set role authenticated; select set_config('test.uid', '${ADMIN}', false); select set_config('request.jwt.claims', '{"role":"authenticated","email":"gerant@test"}', false);`);
  await db.query(`select public.admin_moderate_product_review('${rz}', 'hide')`);
  await db.exec(`reset role; select set_config('test.uid', '${BASE}', false); select set_config('request.jwt.claims', '', false);`);
  assert.ok(Number((await db.query("select count(*) as n from public.activity_log where entity = 'avis produit'")).rows[0].n) >= 1);
  await load();
  console.log("admin : liste et compteur réservés ; produits reçus à noter ; modération au journal ; migration rejouable : OK");
  console.log("TESTS AVIS PRODUITS : OK");
}

// ===================== Carnet d'adresses =====================
{
  const A = "00000000-0000-0000-0000-0000000000a1";
  const Z = "00000000-0000-0000-0000-0000000000e9";
  const add = (uid, label, extra = "") =>
    as("authenticated", uid, `insert into public.customer_addresses (label, recipient_name, phone, zone_id, city, address, instructions${extra ? ", lat, lng" : ""}) values ('${label}', 'Aminata <b>Coulibaly</b>', '66112233', 'bamako-commune-1', 'Kalaban', 'Rue 10, derrière la pharmacie', 'Appeler en arrivant'${extra}) returning id, is_default, recipient_name`);

  // Visiteur : ni lecture ni écriture
  await assert.rejects(as("anon", "", "select * from public.customer_addresses"), /permission denied/);
  await assert.rejects(as("anon", "", "insert into public.customer_addresses (recipient_name, phone, zone_id, address) values ('Pirate', '66112233', 'bamako-commune-1', 'Rue X')"), /permission denied/);

  const home = (await add(A, "Maison", ", 12.6392, -8.0029")).rows[0];
  assert.equal(home.is_default, true); // première adresse = par défaut
  assert.equal(home.recipient_name, "Aminata Coulibaly"); // HTML retiré
  const office = (await add(A, "Bureau")).rows[0];
  assert.equal(office.is_default, false);
  await as("authenticated", A, `update public.customer_addresses set is_default = true where id = '${office.id}'`);
  const defaults = (await db.query("select id from public.customer_addresses where user_id = $1 and is_default", [A])).rows;
  assert.deepEqual(defaults.map((d) => d.id), [office.id]);
  await as("authenticated", A, `delete from public.customer_addresses where id = '${office.id}'`);
  assert.equal((await db.query("select is_default from public.customer_addresses where id = $1", [home.id])).rows[0].is_default, true);
  console.log("carnet : première adresse par défaut, une seule par défaut, relais après suppression, HTML retiré : OK");

  // Chacun ses adresses
  assert.equal((await as("authenticated", Z, "select count(*) as n from public.customer_addresses")).rows[0].n, 0);
  assert.equal((await as("authenticated", Z, `update public.customer_addresses set address = 'Piratée' where id = '${home.id}'`)).affectedRows, 0);
  assert.equal((await as("authenticated", Z, `delete from public.customer_addresses where id = '${home.id}'`)).affectedRows, 0);
  await assert.rejects(as("authenticated", Z, `insert into public.customer_addresses (user_id, recipient_name, phone, zone_id, address) values ('${A}', 'Pirate', '66112233', 'bamako-commune-1', 'Rue X')`), /permission denied/);
  await assert.rejects(add(Z, "X', 'x', '1', 'zone-inconnue', 'x', 'xxx', '') --"), /./);
  await assert.rejects(as("authenticated", A, `update public.customer_addresses set user_id = '${Z}' where id = '${home.id}'`), /permission denied/);
  console.log("RLS : un client ne lit, ne modifie ni ne supprime jamais les adresses d'un autre : OK");

  // Validation et limite de 10
  await assert.rejects(as("authenticated", Z, "insert into public.customer_addresses (recipient_name, phone, zone_id, address) values ('Zoé', '123', 'bamako-commune-1', 'Rue 1')"), /check/);
  await assert.rejects(as("authenticated", Z, "insert into public.customer_addresses (recipient_name, phone, zone_id, address, lat) values ('Zoé', '66112233', 'bamako-commune-1', 'Rue 1', 12.6)"), /check/);
  for (let i = 0; i < 10; i++) await add(Z, `A${i}`);
  await assert.rejects(add(Z, "A10"), /too_many_addresses/);
  console.log("validation (téléphone, position complète) et 10 adresses au plus : OK");

  // Commande : copie des consignes et de la position, une fois, sur SA commande seulement
  const watch = (await db.query("select id from public.products where slug = 'montre-connectee-yesido-io22'")).rows[0].id;
  const customer = JSON.stringify({ name: "Aminata Coulibaly", phone: "66112233", zone_id: "bamako-commune-1", city: "Kalaban", address: "Rue 10, derrière la pharmacie" });
  const o = (await as("authenticated", A, `select * from public.place_order('${customer}'::jsonb, '[{"product_id":"${watch}","qty":1}]'::jsonb, 'home', 'cod')`)).rows[0];
  await assert.rejects(as("anon", "", `select public.set_order_delivery_details('${o.order_id}', 'x')`), /permission denied/);
  assert.equal((await as("authenticated", Z, `select public.set_order_delivery_details('${o.order_id}', 'Pirate', 1, 1) as ok`)).rows[0].ok, false);
  assert.equal((await as("authenticated", A, `select public.set_order_delivery_details('${o.order_id}', '<i>Appeler</i> en arrivant', 12.6392, -8.0029) as ok`)).rows[0].ok, true);
  assert.equal((await as("authenticated", A, `select public.set_order_delivery_details('${o.order_id}', 'Changé', 1, 1) as ok`)).rows[0].ok, false);
  const saved = (await db.query("select delivery_instructions, delivery_lat, delivery_lng, address, city from public.orders where id = $1", [o.order_id])).rows[0];
  assert.deepEqual([saved.delivery_instructions, Number(saved.delivery_lat), Number(saved.delivery_lng)], ["Appeler en arrivant", 12.6392, -8.0029]);
  // Le carnet change ou disparaît : la commande garde sa copie
  await as("authenticated", A, `update public.customer_addresses set address = 'Nouvelle adresse', instructions = 'Autre' where id = '${home.id}'`);
  await as("authenticated", A, `delete from public.customer_addresses where id = '${home.id}'`);
  const after = (await db.query("select address, city, delivery_instructions from public.orders where id = $1", [o.order_id])).rows[0];
  assert.deepEqual([after.address, after.city, after.delivery_instructions], ["Rue 10, derrière la pharmacie", "Kalaban", "Appeler en arrivant"]);
  console.log("commande : consignes et position copiées une seule fois, sur sa commande ; carnet modifié ou vidé sans effet sur la commande : OK");

  // Sans adresse enregistrée : commande exactement comme avant
  const plain = (await as("authenticated", Z, `select * from public.place_order('${customer}'::jsonb, '[{"product_id":"${watch}","qty":1}]'::jsonb, 'pickup', 'cod')`)).rows[0];
  const p = (await db.query("select delivery_instructions, delivery_lat from public.orders where id = $1", [plain.order_id])).rows[0];
  assert.deepEqual([p.delivery_instructions, p.delivery_lat], [null, null]);
  await load();
  console.log("commande sans carnet : identique à avant ; migration rejouable : OK");
  console.log("TESTS CARNET D'ADRESSES : OK");
}

// =============================================================================
// Migration 26 : renforcement de la sécurité
// =============================================================================
{
  rateGuard = true;
  await load();
  const R = "00000000-0000-0000-0000-00000000aa26";
  const R2 = "00000000-0000-0000-0000-00000000bb26";
  await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, 'rafale@test', now()), ($2, 'autre@test', now())", [R, R2]);
  const loupe = (await db.query("insert into public.products (name, slug, price, stock, images, is_active) values ('Produit rafale', 'produit-rafale', 1000, 100, '{/photos/x.webp}', true) returning id")).rows[0].id;
  const customer = JSON.stringify({ name: "Client Rafale", phone: "66112233", zone_id: "bamako-commune-1", city: "Kalaban", address: "Rue 1" });
  const place = (uid) => as("authenticated", uid, `select * from public.place_order('${customer}'::jsonb, '[{"product_id":"${loupe}","qty":1}]'::jsonb, 'pickup', 'cod')`);
  for (let i = 0; i < 5; i++) await place(R);
  const stockBefore = (await db.query("select stock from public.products where id = $1", [loupe])).rows[0].stock;
  await assert.rejects(place(R), /too_many_orders/);
  assert.equal((await db.query("select stock from public.products where id = $1", [loupe])).rows[0].stock, stockBefore, "stock intact après refus");
  await place(R2); // un autre compte n'est pas bloqué
  await db.query("update public.orders set created_at = now() - interval '61 minutes' where user_id = $1", [R]);
  await place(R); // une heure plus tard : de nouveau permis
  await assert.rejects(as("authenticated", R, "select public.orders_rate_guard()"), /permission denied|trigger functions/);
  console.log("commandes : 5 par heure et par compte, refus sans toucher au stock, autres comptes libres, reprise après une heure : OK");

  // Photos d'avis : son dossier seulement, 20 par jour
  const up = (uid, name) => as("authenticated", uid, `insert into storage.objects (bucket_id, name, owner) values ('catalog', '${name}', '${uid}')`);
  await assert.rejects(up(R, `reviews/${R2}/x.webp`), /row-level security/);
  await assert.rejects(up(R, "products/x.webp"), /row-level security/);
  await assert.rejects(as("anon", "", `insert into storage.objects (bucket_id, name) values ('catalog', 'reviews/x/y.webp')`), /permission denied|row-level security/);
  for (let i = 0; i < 20; i++) await up(R, `reviews/${R}/p${i}.webp`);
  await assert.rejects(up(R, `reviews/${R}/p20.webp`), /row-level security/);
  await up(R2, `reviews/${R2}/a.webp`);
  await db.query("update storage.objects set created_at = now() - interval '25 hours' where name like $1", [`reviews/${R}/%`]);
  await up(R, `reviews/${R}/lendemain.webp`);
  await assert.rejects(as("anon", "", "select public.review_photo_quota_ok()"), /permission denied/);
  console.log("photos d'avis : son dossier seulement, 20 par jour et par client : OK");

  await load();
  assert.equal(await count("select count(*) as n from pg_trigger where tgname = 'orders_rate_guard'"), 1);
  console.log("migration 26 rejouable : OK");
  console.log("TESTS RENFORCEMENT : OK");
}
