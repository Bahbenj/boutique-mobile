/**
 * Génère supabase/all-in-one.sql : toutes les migrations (ordre des fichiers)
 * puis seed.sql, dans UNE transaction, à coller en une fois dans le SQL Editor.
 * Usage : npm run db:all-in-one  (à relancer après toute modification SQL).
 *
 * --sans-exemples (npm run db:restauration) : génère supabase/restauration.sql, les
 * migrations SEULES, sans seed.sql. Sert après la restauration d'une sauvegarde à
 * remettre fonctions, droits, stockage et déclencheurs, sans faire réapparaître les
 * produits et catégories d'exemple que le commerçant aurait supprimés.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase");
const restore = process.argv.includes("--sans-exemples");
const migrations = readdirSync(join(dir, "migrations")).filter((f) => f.endsWith(".sql")).sort();
const parts = [
  ...migrations.map((f) => [`migrations/${f}`, readFileSync(join(dir, "migrations", f), "utf8")]),
  ...(restore ? [] : [["seed.sql", readFileSync(join(dir, "seed.sql"), "utf8")]]),
];
const out = restore ? "restauration.sql" : "all-in-one.sql";

const banner = (name) => `\n-- ${"#".repeat(77)}\n-- # ${name}\n-- ${"#".repeat(77)}\n`;
const sql = [
  "-- =============================================================================",
  restore
    ? "-- RESTAURATION · migrations seules, sans exemples (scripts/build-all-in-one.mjs --sans-exemples)."
    : "-- TOUT-EN-UN · généré par scripts/build-all-in-one.mjs : ne pas modifier à la main.",
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

writeFileSync(join(dir, out), sql);
console.log(`supabase/${out} : ${parts.length} fichiers, ${sql.split("\n").length} lignes`);
