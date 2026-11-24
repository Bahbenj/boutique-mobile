/**
 * Génère supabase/all-in-one.sql : toutes les migrations (ordre des fichiers)
 * puis seed.sql, dans UNE transaction, à coller en une fois dans le SQL Editor.
 * Usage : npm run db:all-in-one  (à relancer après toute modification SQL).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase");
const migrations = readdirSync(join(dir, "migrations")).filter((f) => f.endsWith(".sql")).sort();
const parts = [
  ...migrations.map((f) => [`migrations/${f}`, readFileSync(join(dir, "migrations", f), "utf8")]),
  ["seed.sql", readFileSync(join(dir, "seed.sql"), "utf8")],
];

const banner = (name) => `\n-- ${"#".repeat(77)}\n-- # ${name}\n-- ${"#".repeat(77)}\n`;
const sql = [
  "-- =============================================================================",
  "-- TOUT-EN-UN · généré par scripts/build-all-in-one.mjs : ne pas modifier à la main.",
  `-- Contenu : ${parts.map(([n]) => n).join(", ")}.`,
  "--",
  "-- À coller en une seule fois dans Supabase → SQL Editor → Run.",
  "-- • Une seule transaction : en cas d'erreur, rien n'est appliqué.",
  "-- • Rejouable : types, tables, index, politiques et déclencheurs ne sont",
  "--   créés ou remplacés que si besoin ; paramètres et produits d'exemple",
  "--   existants ne sont jamais écrasés (on conflict do nothing).",
  "-- =============================================================================",
  "",
  "begin;",
  ...parts.map(([name, body]) => banner(name) + body.trim() + "\n"),
  "commit;",
  "",
].join("\n");

writeFileSync(join(dir, "all-in-one.sql"), sql);
console.log(`supabase/all-in-one.sql : ${parts.length} fichiers, ${sql.split("\n").length} lignes`);
