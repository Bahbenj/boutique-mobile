// npm run audit:db : liste RLS, GRANT, politiques et fonctions exécutables par rôle.
// À relire après toute migration : aucune table sans RLS, aucune écriture sans contrôle.
// Audit des droits : RLS, GRANT table / colonne, fonctions exécutables, security definer.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const sql = readFileSync(process.argv[2], "utf8");
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, last_sign_in_at timestamptz, email_confirmed_at timestamptz, created_at timestamptz default now(), raw_user_meta_data jsonb, raw_app_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
  alter table storage.objects enable row level security;
`);
await db.exec(sql);
const q = async (s) => (await db.query(s)).rows;

console.log("== Tables public : RLS ==");
for (const r of await q(`select c.relname, c.relrowsecurity rls, c.relforcerowsecurity force from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1`))
  console.log(`${r.rls ? "RLS " : "!!! SANS RLS "} ${r.relname}`);

console.log("\n== GRANT table (anon / authenticated) ==");
for (const r of await q(`select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','PUBLIC') group by 1,2 order by 1,2`))
  console.log(`${r.table_name.padEnd(28)} ${r.grantee.padEnd(14)} ${r.p}`);

console.log("\n== GRANT colonne (UPDATE/INSERT, anon / authenticated) ==");
for (const r of await q(`select table_name, grantee, privilege_type, string_agg(column_name, ',' order by column_name) cols from information_schema.column_privileges where table_schema='public' and grantee in ('anon','authenticated') and privilege_type in ('UPDATE','INSERT')
  and (table_name, grantee, privilege_type) not in (select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema='public')
  group by 1,2,3 order by 1,2,3`))
  console.log(`${r.table_name.padEnd(28)} ${r.grantee.padEnd(14)} ${r.privilege_type.padEnd(7)} ${r.cols}`);

console.log("\n== Politiques ==");
for (const r of await q(`select tablename, policyname, cmd, roles::text roles, qual, with_check from pg_policies where schemaname in ('public','storage') order by 1,2`))
  console.log(`${r.tablename.padEnd(24)} ${r.cmd.padEnd(7)} ${r.roles.padEnd(28)} ${r.policyname}\n     USING ${r.qual ?? "-"}\n     CHECK ${r.with_check ?? "-"}`);

console.log("\n== Fonctions exécutables par anon / authenticated ==");
for (const r of await q(`select p.proname, p.prosecdef secdef, coalesce(array_to_string(p.proconfig, ','),'') cfg,
   has_function_privilege('anon', p.oid, 'execute') anon, has_function_privilege('authenticated', p.oid, 'execute') auth
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1`))
  console.log(`${r.proname.padEnd(34)} ${r.secdef ? "DEFINER" : "invoker"} anon=${r.anon ? "OUI" : "non"} auth=${r.auth ? "OUI" : "non"} ${r.secdef && !r.cfg.includes("search_path") ? "!!! search_path absent" : ""}`);
