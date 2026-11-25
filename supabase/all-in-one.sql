-- =============================================================================
-- TOUT-EN-UN · généré par scripts/build-all-in-one.mjs : ne pas modifier à la main.
-- Contenu : migrations/20261124000100_schema.sql, migrations/20261124000200_security.sql, migrations/20261124000300_orders.sql, migrations/20261124000400_storage_settings.sql, migrations/20261124000500_storage_admin_select.sql, migrations/20261124000600_grants.sql, migrations/20261125000700_dashboard.sql, migrations/20261125000800_mali.sql, migrations/20261125000900_mobile_empire.sql, migrations/20261125001000_facebook.sql, migrations/20261125001100_storefront.sql, migrations/20261125001200_order_history.sql, seed.sql.
--
-- À coller en une seule fois dans Supabase → SQL Editor → Run.
-- • Une seule transaction : en cas d'erreur, rien n'est appliqué.
-- • Rejouable : types, tables, index, politiques et déclencheurs ne sont
--   créés ou remplacés que si besoin ; paramètres et produits d'exemple
--   existants ne sont jamais écrasés (on conflict do nothing).
-- =============================================================================

begin;

-- #############################################################################
-- # migrations/20261124000100_schema.sql
-- #############################################################################
-- =============================================================================
-- 1/4 · Schéma : tables, types, contraintes, index
-- =============================================================================

-- --- Types -------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'product_condition') then
    create type public.product_condition as enum ('neuf', 'occasion', 'reconditionne');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'order_status') then
    create type public.order_status as enum ('nouvelle', 'confirmee', 'expediee', 'livree', 'annulee');
  end if;
end
$$;

-- --- Horodatage automatique -------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- --- Administrateurs ----------------------------------------------------------
-- Un utilisateur Supabase Auth est administrateur s'il figure dans cette table.
-- Ajout uniquement depuis le tableau de bord Supabase (SQL), jamais depuis le site.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- --- Catégories ---------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 300),
  image text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_position_idx on public.categories (position);

create or replace trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- --- Produits -----------------------------------------------------------------
-- variants : { "colors": [{ "name", "hex" }], "storage": [{ "label", "price", "old_price" }] }
-- specs    : [["Écran", "6,1″ OLED"], ...]
-- Prix en dinars (3 décimales = millimes).

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 5000),
  category_id uuid references public.categories (id) on delete set null,
  brand text not null default '' check (char_length(brand) <= 60),
  price numeric(10, 3) not null check (price >= 0),
  old_price numeric(10, 3) check (old_price is null or old_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  condition public.product_condition not null default 'neuf',
  grade text check (grade is null or char_length(grade) <= 40),
  battery smallint check (battery is null or battery between 0 and 100),
  is_new boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  images text[] not null default '{}',
  variants jsonb not null default '{}'::jsonb check (jsonb_typeof(variants) = 'object'),
  highlights text[] not null default '{}',
  specs jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_featured_idx on public.products (is_active, is_featured);
create index if not exists products_stock_idx on public.products (stock) where is_active;

create or replace trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- --- Commandes ----------------------------------------------------------------
-- items : snapshot des lignes au moment de la commande (nom, variante, prix
-- recalculé côté serveur, quantité), indépendant des modifications futures.

create sequence if not exists public.order_number_seq start with 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('CMD-' || nextval('public.order_number_seq')),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (phone ~ '^[0-9]{8}$'),
  governorate text not null check (char_length(governorate) between 2 and 40),
  city text not null default '' check (char_length(city) <= 80),
  address text not null default '' check (char_length(address) <= 300),
  delivery_method text not null default 'home' check (char_length(delivery_method) <= 30),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal numeric(10, 3) not null check (subtotal >= 0),
  delivery_fee numeric(10, 3) not null default 0 check (delivery_fee >= 0),
  total numeric(10, 3) not null check (total >= 0),
  status public.order_status not null default 'nouvelle',
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);

create or replace trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- --- Paramètres (clé / valeur) --------------------------------------------------
-- Clés utilisées : store, delivery, announcement (voir la migration 4).

create table if not exists public.settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();


-- #############################################################################
-- # migrations/20261124000200_security.sql
-- #############################################################################
-- =============================================================================
-- 2/4 · Sécurité : rôle admin et Row Level Security
-- =============================================================================
-- Règles :
--   • lecture publique des catégories, des produits actifs et des paramètres ;
--   • commandes : aucune lecture ni écriture publique directe. Les commandes
--     du site passent par le serveur Next.js, qui appelle public.place_order()
--     (migration 3) : prix recalculés depuis la base, stock décrémenté.
--   • tout le reste est réservé aux administrateurs.

-- --- Rôle admin ---------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- --- Activation de RLS ----------------------------------------------------------

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.settings enable row level security;

-- --- admins : chacun peut seulement vérifier sa propre ligne --------------------

drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- --- categories -------------------------------------------------------------------

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories
  for select to anon, authenticated
  using (true);

drop policy if exists "categories_insert_admin" on public.categories;
create policy "categories_insert_admin" on public.categories
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "categories_update_admin" on public.categories;
create policy "categories_update_admin" on public.categories
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "categories_delete_admin" on public.categories;
create policy "categories_delete_admin" on public.categories
  for delete to authenticated
  using ((select public.is_admin()));

-- --- products : public = actifs seulement ; admin = tout -------------------------

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "products_insert_admin" on public.products;
create policy "products_insert_admin" on public.products
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin" on public.products
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products
  for delete to authenticated
  using ((select public.is_admin()));

-- --- orders : admin uniquement (création publique via place_order) --------------

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete to authenticated
  using ((select public.is_admin()));

-- --- settings : lecture publique (infos du magasin), écriture admin --------------

drop policy if exists "settings_select_public" on public.settings;
create policy "settings_select_public" on public.settings
  for select to anon, authenticated
  using (true);

drop policy if exists "settings_insert_admin" on public.settings;
create policy "settings_insert_admin" on public.settings
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "settings_update_admin" on public.settings;
create policy "settings_update_admin" on public.settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "settings_delete_admin" on public.settings;
create policy "settings_delete_admin" on public.settings
  for delete to authenticated
  using ((select public.is_admin()));

-- --- Séquence des numéros de commande : pas d'accès public ------------------------

revoke all on sequence public.order_number_seq from anon, authenticated;


-- #############################################################################
-- # migrations/20261124000300_orders.sql
-- #############################################################################
-- =============================================================================
-- 3/4 · Commandes : création sûre et gestion du stock
-- =============================================================================

-- --- place_order ----------------------------------------------------------------
-- Appelée uniquement par le serveur Next.js (clé service_role), après validation
-- zod et anti-spam. Ne fait AUCUNE confiance aux prix envoyés : ils sont relus
-- en base, variante par variante. Le stock est décrémenté dans la même
-- transaction, avec verrouillage des lignes produits : deux clients ne peuvent
-- pas acheter le dernier exemplaire en même temps.
--
-- p_customer : { name, phone (8 chiffres), governorate, city, address, note }
-- p_items    : [{ product_id, qty, color?, storage? }]
-- p_delivery : identifiant d'option ("home", "express", "pickup")
--
-- Erreurs levées (message) : invalid_items, invalid_qty, product_unavailable,
-- invalid_variant, insufficient_stock, invalid_delivery.

create or replace function public.place_order(p_customer jsonb, p_items jsonb, p_delivery text)
returns table (order_id uuid, order_number text, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_price numeric;
  v_color text;
  v_storage text;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_delivery jsonb;
  v_option jsonb;
  v_free_from numeric;
  v_order public.orders%rowtype;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_items';
  end if;

  -- Verrouille les produits concernés dans un ordre stable (évite les interblocages)
  perform 1
    from public.products
    where id in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
    order by id
    for update;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'invalid_qty';
    end if;

    select * into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then
      raise exception 'product_unavailable';
    end if;

    v_color := nullif(v_item ->> 'color', '');
    v_storage := nullif(v_item ->> 'storage', '');

    -- Prix : celui de la capacité choisie, sinon le prix de base
    v_price := v_product.price;
    if jsonb_array_length(coalesce(v_product.variants -> 'storage', '[]'::jsonb)) > 0 then
      select (s ->> 'price')::numeric into v_price
        from jsonb_array_elements(v_product.variants -> 'storage') s
        where s ->> 'label' = v_storage;
      if v_price is null then
        raise exception 'invalid_variant';
      end if;
    end if;

    -- Couleur : doit exister si le produit en propose
    if jsonb_array_length(coalesce(v_product.variants -> 'colors', '[]'::jsonb)) > 0
       and not exists (
         select 1 from jsonb_array_elements(v_product.variants -> 'colors') c where c ->> 'name' = v_color
       ) then
      raise exception 'invalid_variant';
    end if;

    -- Décrément atomique : échoue si le stock (déjà réduit par une ligne précédente) ne suffit plus
    update public.products set stock = stock - v_qty where id = v_product.id and stock >= v_qty;
    if not found then
      raise exception 'insufficient_stock' using detail = v_product.name;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'color', v_color,
      'storage', v_storage,
      'qty', v_qty,
      'price', v_price,
      'image', v_product.images[1]
    );
    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  -- Livraison : option, frais par gouvernorat, seuil de gratuité (paramètres)
  select value into v_delivery from public.settings where key = 'delivery';
  select o into v_option
    from jsonb_array_elements(coalesce(v_delivery -> 'options', '[]'::jsonb)) o
    where o ->> 'id' = p_delivery;
  if v_option is null then
    raise exception 'invalid_delivery';
  end if;

  v_free_from := (v_delivery ->> 'free_from')::numeric;
  if p_delivery = 'pickup' then
    v_fee := 0;
  elsif p_delivery = 'home' then
    v_fee := coalesce(
      (v_delivery -> 'governorate_fees' ->> (p_customer ->> 'governorate'))::numeric,
      (v_option ->> 'price')::numeric,
      0
    );
    if v_free_from is not null and v_subtotal >= v_free_from then
      v_fee := 0;
    end if;
  else
    v_fee := coalesce((v_option ->> 'price')::numeric, 0);
  end if;

  insert into public.orders (
    customer_name, phone, governorate, city, address, delivery_method,
    items, subtotal, delivery_fee, total, note
  ) values (
    trim(p_customer ->> 'name'),
    p_customer ->> 'phone',
    p_customer ->> 'governorate',
    coalesce(trim(p_customer ->> 'city'), ''),
    coalesce(trim(p_customer ->> 'address'), ''),
    p_delivery,
    v_lines,
    v_subtotal,
    v_fee,
    v_subtotal + v_fee,
    nullif(trim(p_customer ->> 'note'), '')
  )
  returning * into v_order;

  return query select v_order.id, v_order.number, v_order.total;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text) to service_role;

-- --- Restockage à l'annulation ----------------------------------------------------
-- Commande annulée : les quantités reviennent en stock. Commande « désannulée » :
-- elles sont reprises (erreur si le stock ne suffit plus).

create or replace function public.orders_restock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line jsonb;
begin
  if new.status = 'annulee' and old.status <> 'annulee' then
    for v_line in select * from jsonb_array_elements(new.items) loop
      update public.products
        set stock = stock + (v_line ->> 'qty')::integer
        where id = (v_line ->> 'product_id')::uuid;
    end loop;
  elsif old.status = 'annulee' and new.status <> 'annulee' then
    for v_line in select * from jsonb_array_elements(new.items) loop
      update public.products
        set stock = stock - (v_line ->> 'qty')::integer
        where id = (v_line ->> 'product_id')::uuid and stock >= (v_line ->> 'qty')::integer;
      if not found and exists (select 1 from public.products where id = (v_line ->> 'product_id')::uuid) then
        raise exception 'insufficient_stock' using detail = v_line ->> 'name';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create or replace trigger orders_restock
  after update of status on public.orders
  for each row execute function public.orders_restock_on_cancel();


-- #############################################################################
-- # migrations/20261124000400_storage_settings.sql
-- #############################################################################
-- =============================================================================
-- 4/4 · Stockage des photos et paramètres par défaut
-- =============================================================================

-- --- Bucket « catalog » : photos produits et catégories -------------------------
-- Public en lecture (URL directes), écriture réservée aux admins.
-- Les photos sont compressées dans le navigateur avant envoi (≤ 5 Mo ici en garde-fou).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "catalog_insert_admin" on storage.objects;
create policy "catalog_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and (select public.is_admin()));

drop policy if exists "catalog_update_admin" on storage.objects;
create policy "catalog_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));

drop policy if exists "catalog_delete_admin" on storage.objects;
create policy "catalog_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));

-- --- Paramètres par défaut (modifiables ensuite depuis /admin/parametres) -------
-- Valeurs reprises de config/site.ts. « on conflict do nothing » : relancer la
-- migration n'écrase jamais ce que le commerçant a saisi.

insert into public.settings (key, value) values
(
  'store',
  '{
    "name": "Boutique Mobile",
    "whatsapp": "21600000000",
    "phone": "+216 00 000 000",
    "email": "contact@example.tn",
    "address": { "street": "Avenue Habib Bourguiba", "city": "Tunis", "governorate": "Tunis", "postal_code": "1000" },
    "hours": [
      { "days": "Lundi – Samedi", "time": "09:00 – 20:00" },
      { "days": "Dimanche", "time": "10:00 – 14:00" }
    ]
  }'::jsonb
),
(
  'delivery',
  '{
    "free_from": 300,
    "options": [
      { "id": "home", "label": "Livraison à domicile", "price": 8, "delay": "24 – 72 h" },
      { "id": "express", "label": "Express (Grand Tunis)", "price": 12, "delay": "Le jour même" },
      { "id": "pickup", "label": "Retrait en magasin", "price": 0, "delay": "Sous 2 h" }
    ],
    "governorate_fees": {}
  }'::jsonb
),
(
  'announcement',
  '{ "enabled": false, "text": "", "link": "" }'::jsonb
)
on conflict (key) do nothing;


-- #############################################################################
-- # migrations/20261124000500_storage_admin_select.sql
-- #############################################################################
-- =============================================================================
-- 5 · Stockage : lecture des fichiers par les admins
-- =============================================================================
-- Supprimer ou remplacer une photo dans Storage exige aussi le droit de
-- lecture (SELECT) sur storage.objects. Le bucket reste public pour l'affichage
-- des photos sur le site ; cette politique ne sert qu'à l'administration.

drop policy if exists "catalog_select_admin" on storage.objects;
create policy "catalog_select_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));


-- #############################################################################
-- # migrations/20261124000600_grants.sql
-- #############################################################################
-- =============================================================================
-- 6 · Droits d'accès explicites (GRANT) pour l'API Supabase
-- =============================================================================
-- Les projets Supabase récents n'accordent plus automatiquement de droits sur
-- les tables créées en SQL : sans GRANT, Postgres refuse l'accès (« permission
-- denied for table … ») AVANT même d'évaluer la Row Level Security.
--
-- Deux verrous successifs :
--   1. GRANT : quelles opérations un rôle peut tenter sur une table ;
--   2. RLS   : quelles lignes il peut réellement lire ou modifier.
-- On accorde ici le strict nécessaire aux politiques de la migration 2 :
--
--   table       anon      authenticated (filtré par RLS)          service_role
--   categories  select    select, insert, update, delete (admin)  tout
--   products    select    select, insert, update, delete (admin)  tout
--   settings    select    select, insert, update, delete (admin)  tout
--   orders      —         select, update, delete (admin)          tout
--   admins      —         select (sa propre ligne)                tout
--
-- Les commandes ne sont jamais insérées directement : place_order() (security
-- definer, exécutable par service_role seulement) s'en charge.
-- Rejouable : on retire d'abord tout droit, puis on accorde.

grant usage on schema public to anon, authenticated, service_role;

-- --- Remise à zéro (retire aussi TRUNCATE, REFERENCES, TRIGGER accordés par
--     l'ancien comportement « grant all » des projets plus anciens) ---------------
revoke all on table public.categories, public.products, public.settings, public.orders, public.admins
  from anon, authenticated;

-- --- Catalogue et réglages : lecture publique, écriture admin (RLS) ----------------
grant select on table public.categories, public.products, public.settings to anon;
grant select, insert, update, delete on table public.categories, public.products, public.settings to authenticated;

-- --- Commandes : aucun accès public ; l'admin lit, change le statut, supprime -------
grant select, update, delete on table public.orders to authenticated;

-- --- Admins : chacun ne peut que vérifier sa propre ligne (RLS) ---------------------
grant select on table public.admins to authenticated;

-- --- service_role (serveur uniquement) : accès complet ------------------------------
grant all on table public.categories, public.products, public.settings, public.orders, public.admins to service_role;
grant usage, select on sequence public.order_number_seq to service_role;

-- --- Fonctions -------------------------------------------------------------------------
-- is_admin() : appelée par les politiques RLS et par le site (rpc) ;
-- s'exécute avec les droits de son propriétaire (security definer).
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- place_order() : serveur uniquement.
revoke all on function public.place_order(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text) to service_role;

-- Fonctions de déclencheurs : jamais appelées directement.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.orders_restock_on_cancel() from public, anon, authenticated;


-- #############################################################################
-- # migrations/20261125000700_dashboard.sql
-- #############################################################################
-- =============================================================================
-- 7 · Tableau de bord : statistiques des commandes
-- =============================================================================
-- Calculées en base (une requête au lieu de rapatrier toutes les commandes),
-- à l'heure de Bamako (GMT) pour que « aujourd'hui » corresponde à la journée du magasin.
--
-- security invoker : s'exécute avec les droits de l'appelant, donc soumise à la
-- RLS des commandes ; un non-admin est en plus refusé explicitement.
-- Périodes calendaires : jour, semaine (depuis lundi), mois (depuis le 1er).
-- Chiffre d'affaires = total des commandes non annulées (livraison comprise) ;
-- « encaissé » = commandes livrées (paiement à la livraison).

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'Africa/Bamako';
  v_day timestamp := date_trunc('day', v_now);
  v_week timestamp := date_trunc('week', v_now);
  v_month timestamp := date_trunc('month', v_now);
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with o as (
    select status, total, created_at at time zone 'Africa/Bamako' as local_at
    from public.orders
    -- commandes du mois + toutes celles encore à traiter (quelle que soit leur date)
    where created_at >= (v_month at time zone 'Africa/Bamako')
       or status in ('nouvelle', 'confirmee', 'expediee')
  )
  select jsonb_build_object(
    'today', jsonb_build_object(
      'orders', count(*) filter (where local_at >= v_day and status <> 'annulee'),
      'revenue', coalesce(sum(total) filter (where local_at >= v_day and status <> 'annulee'), 0)
    ),
    'week', jsonb_build_object(
      'orders', count(*) filter (where local_at >= v_week and status <> 'annulee'),
      'revenue', coalesce(sum(total) filter (where local_at >= v_week and status <> 'annulee'), 0)
    ),
    'month', jsonb_build_object(
      'orders', count(*) filter (where local_at >= v_month and status <> 'annulee'),
      'revenue', coalesce(sum(total) filter (where local_at >= v_month and status <> 'annulee'), 0),
      'collected', coalesce(sum(total) filter (where local_at >= v_month and status = 'livree'), 0),
      'cancelled', count(*) filter (where local_at >= v_month and status = 'annulee')
    ),
    'pending', jsonb_build_object(
      'nouvelle', count(*) filter (where status = 'nouvelle'),
      'confirmee', count(*) filter (where status = 'confirmee'),
      'expediee', count(*) filter (where status = 'expediee')
    ),
    'generated_at', now()
  )
  into v_result
  from o;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

-- --- Commandes : droits resserrés à l'usage réel de l'admin -----------------------
-- L'admin ne modifie que le statut (le restockage à l'annulation est fait par
-- le déclencheur) et ne supprime jamais une commande : une suppression
-- fausserait le stock. Montants, articles et coordonnées sont donc
-- non modifiables via l'API, même pour un admin.
revoke update, delete on table public.orders from authenticated;
grant update (status) on table public.orders to authenticated;


-- #############################################################################
-- # migrations/20261125000800_mali.sql
-- #############################################################################
-- =============================================================================
-- 8 · Adaptation au Mali : FCFA, zones de livraison, +223, Mobile Money
-- =============================================================================
-- Rejouable. Ne remplace jamais une saisie du commerçant : les valeurs
-- d'exemple tunisiennes ne sont converties que si elles sont restées intactes.

-- --- 1. Montants en francs CFA : entiers, sans décimales ----------------------
-- numeric(10,3) (dinars, millimes) plafonnait à 9 999 999 : insuffisant en FCFA
-- pour une grosse commande. numeric(12,0) : jusqu'à 999 milliards, arrondi à l'unité.

alter table public.products
  alter column price type numeric(12, 0) using round(price),
  alter column old_price type numeric(12, 0) using round(old_price);

alter table public.orders
  alter column subtotal type numeric(12, 0) using round(subtotal),
  alter column delivery_fee type numeric(12, 0) using round(delivery_fee),
  alter column total type numeric(12, 0) using round(total);

-- --- 2. Commandes : « gouvernorat » devient « région / commune » ---------------

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'orders' and column_name = 'governorate') then
    alter table public.orders rename column governorate to region;
  end if;
  if exists (select 1 from pg_constraint where conname = 'orders_governorate_check') then
    alter table public.orders rename constraint orders_governorate_check to orders_region_check;
  end if;
end
$$;

alter table public.orders drop constraint if exists orders_region_check;
alter table public.orders add constraint orders_region_check check (char_length(region) between 2 and 80);

-- Mode de paiement choisi par le client (pas de paiement en ligne)
alter table public.orders add column if not exists payment_method text not null default 'cod';
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod', 'orange_money', 'moov_money', 'wave', 'sama_money', 'virement'));

-- --- 3. Zones de livraison --------------------------------------------------------
-- District de Bamako (communes I à VI) puis régions. Frais, délai et activation
-- modifiables dans /admin/parametres. id = identifiant stable (non modifiable).

create table if not exists public.delivery_zones (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  zone_group text not null check (zone_group in ('bamako', 'region')),
  fee numeric(12, 0) not null default 0 check (fee >= 0),
  delay text not null default '' check (char_length(delay) <= 40),
  is_active boolean not null default true,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace trigger delivery_zones_updated_at
  before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.delivery_zones enable row level security;

drop policy if exists "delivery_zones_select_public" on public.delivery_zones;
create policy "delivery_zones_select_public" on public.delivery_zones
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "delivery_zones_insert_admin" on public.delivery_zones;
create policy "delivery_zones_insert_admin" on public.delivery_zones
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "delivery_zones_update_admin" on public.delivery_zones;
create policy "delivery_zones_update_admin" on public.delivery_zones
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "delivery_zones_delete_admin" on public.delivery_zones;
create policy "delivery_zones_delete_admin" on public.delivery_zones
  for delete to authenticated
  using ((select public.is_admin()));

-- Droits au strict nécessaire (cf. migration 6) : lecture publique des zones
-- actives (RLS), modification par l'admin, pas de suppression depuis l'API
-- (une zone se désactive ; la supprimer casserait l'historique).
revoke all on table public.delivery_zones from anon, authenticated;
grant select on table public.delivery_zones to anon;
grant select, insert, update on table public.delivery_zones to authenticated;
grant all on table public.delivery_zones to service_role;

insert into public.delivery_zones (id, name, zone_group, fee, delay, is_active, position) values
  ('bamako-commune-1', 'Bamako – Commune I', 'bamako', 1500, '24 h', true, 0),
  ('bamako-commune-2', 'Bamako – Commune II', 'bamako', 1500, '24 h', true, 1),
  ('bamako-commune-3', 'Bamako – Commune III', 'bamako', 1500, '24 h', true, 2),
  ('bamako-commune-4', 'Bamako – Commune IV', 'bamako', 1500, '24 h', true, 3),
  ('bamako-commune-5', 'Bamako – Commune V', 'bamako', 2000, '24 h', true, 4),
  ('bamako-commune-6', 'Bamako – Commune VI', 'bamako', 2000, '24 h', true, 5),
  ('kayes', 'Région de Kayes', 'region', 5000, '3 à 5 jours', true, 6),
  ('koulikoro', 'Région de Koulikoro', 'region', 3000, '1 à 2 jours', true, 7),
  ('sikasso', 'Région de Sikasso', 'region', 4000, '2 à 4 jours', true, 8),
  ('segou', 'Région de Ségou', 'region', 4000, '2 à 4 jours', true, 9),
  ('mopti', 'Région de Mopti', 'region', 5000, '3 à 5 jours', true, 10),
  ('tombouctou', 'Région de Tombouctou', 'region', 7500, '5 à 7 jours', true, 11),
  ('gao', 'Région de Gao', 'region', 7500, '5 à 7 jours', true, 12),
  ('kidal', 'Région de Kidal', 'region', 10000, 'Sur demande', false, 13),
  ('menaka', 'Région de Ménaka', 'region', 10000, 'Sur demande', false, 14),
  ('taoudenit', 'Région de Taoudénit', 'region', 10000, 'Sur demande', false, 15)
on conflict (id) do nothing;

-- --- 4. Paramètres : livraison, paiement, magasin --------------------------------

-- Livraison : remplace l'ancienne structure (options + frais par gouvernorat)
update public.settings
  set value = '{ "free_from": 100000, "pickup": { "enabled": true, "label": "Retrait en magasin", "delay": "Sous 2 h" } }'::jsonb
  where key = 'delivery' and (value ? 'governorate_fees' or value ? 'options');

insert into public.settings (key, value) values
  ('delivery', '{ "free_from": 100000, "pickup": { "enabled": true, "label": "Retrait en magasin", "delay": "Sous 2 h" } }'::jsonb)
on conflict (key) do nothing;

-- Paiement : modes activables, numéros Mobile Money du magasin (exemples)
insert into public.settings (key, value) values
  ('payment', '{
  "methods": [
    {
      "id": "cod",
      "label": "Paiement à la livraison",
      "account": "",
      "instructions": "Vous payez en espèces au livreur, après avoir vérifié le colis.",
      "enabled": true
    },
    {
      "id": "orange_money",
      "label": "Orange Money",
      "account": "+223 70 00 00 00",
      "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.",
      "enabled": true
    },
    {
      "id": "moov_money",
      "label": "Moov Money",
      "account": "+223 60 00 00 00",
      "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.",
      "enabled": true
    },
    {
      "id": "wave",
      "label": "Wave",
      "account": "+223 70 00 00 00",
      "instructions": "Nous vous envoyons le lien ou le numéro Wave par WhatsApp après confirmation.",
      "enabled": true
    },
    {
      "id": "sama_money",
      "label": "Sama Money",
      "account": "+223 70 00 00 00",
      "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.",
      "enabled": true
    },
    {
      "id": "virement",
      "label": "Virement bancaire",
      "account": "",
      "instructions": "Nous vous envoyons nos coordonnées bancaires par WhatsApp après confirmation.",
      "enabled": true
    }
  ]
}'::jsonb)
on conflict (key) do nothing;

-- Magasin : chaque champ est converti SEULEMENT s'il contient encore la valeur
-- d'exemple tunisienne ; tout champ déjà saisi par le commerçant est conservé.
update public.settings
  set value = value
    || case when value ->> 'whatsapp' = '21600000000' then '{ "whatsapp": "22370000000" }'::jsonb else '{}'::jsonb end
    || case when value ->> 'phone' = '+216 00 000 000' then '{ "phone": "+223 70 00 00 00" }'::jsonb else '{}'::jsonb end
    || case when value ->> 'email' = 'contact@example.tn' then '{ "email": "contact@example.com" }'::jsonb else '{}'::jsonb end
    || case when value -> 'address' ->> 'street' = 'Avenue Habib Bourguiba' and value -> 'address' ->> 'city' = 'Tunis'
         then '{ "address": { "street": "Rue 311, ACI 2000", "district": "Commune IV", "city": "Bamako" } }'::jsonb else '{}'::jsonb end
    || case when value -> 'hours' = '[{ "days": "Lundi – Samedi", "time": "09:00 – 20:00" }, { "days": "Dimanche", "time": "10:00 – 14:00" }]'::jsonb
         then '{ "hours": [{ "days": "Lundi – Samedi", "time": "08:30 – 20:00" }, { "days": "Dimanche", "time": "10:00 – 14:00" }] }'::jsonb else '{}'::jsonb end
    || case when value ? 'time_zone' then '{}'::jsonb else '{ "time_zone": "Africa/Bamako" }'::jsonb end
  where key = 'store';

-- --- 5. Produits d'exemple : prix en FCFA ------------------------------------------
-- Uniquement si le prix ET les capacités sont encore ceux de l'exemple en dinars :
-- un prix modifié par le commerçant n'est jamais touché.

update public.products
  set price = 750000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"128 Go","price":750000},{"label":"256 Go","price":830000},{"label":"512 Go","price":980000}]'::jsonb) else variants end
  where slug = 'iphone-15-pro' and price = 4799 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"128 Go","price":4799},{"label":"256 Go","price":5299},{"label":"512 Go","price":6199}]'::jsonb;

update public.products
  set price = 700000, old_price = 750000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"256 Go","price":700000,"old_price":750000},{"label":"512 Go","price":780000,"old_price":830000}]'::jsonb) else variants end
  where slug = 'samsung-galaxy-s24-ultra' and price = 4399 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"256 Go","price":4399,"old_price":4699},{"label":"512 Go","price":4899,"old_price":5199}]'::jsonb;

update public.products
  set price = 400000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"128 Go","price":400000},{"label":"256 Go","price":460000}]'::jsonb) else variants end
  where slug = 'iphone-13' and price = 2499 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"128 Go","price":2499},{"label":"256 Go","price":2899}]'::jsonb;

update public.products
  set price = 215000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"128 Go","price":215000},{"label":"256 Go","price":245000}]'::jsonb) else variants end
  where slug = 'samsung-galaxy-a55' and price = 1349 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"128 Go","price":1349},{"label":"256 Go","price":1549}]'::jsonb;

update public.products
  set price = 175000, old_price = 190000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"256 Go","price":175000,"old_price":190000},{"label":"512 Go","price":205000,"old_price":220000}]'::jsonb) else variants end
  where slug = 'xiaomi-redmi-note-13-pro' and price = 1099 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"256 Go","price":1099,"old_price":1199},{"label":"512 Go","price":1299,"old_price":1399}]'::jsonb;

update public.products
  set price = 270000, old_price = 350000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"128 Go","price":270000,"old_price":350000},{"label":"256 Go","price":300000,"old_price":380000}]'::jsonb) else variants end
  where slug = 'iphone-12-pro-occasion' and price = 1699 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"128 Go","price":1699,"old_price":2199},{"label":"256 Go","price":1899,"old_price":2399}]'::jsonb;

update public.products
  set price = 165000, old_price = 220000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"64 Go","price":165000,"old_price":220000},{"label":"128 Go","price":190000,"old_price":245000}]'::jsonb) else variants end
  where slug = 'iphone-11-occasion' and price = 1049 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"64 Go","price":1049,"old_price":1399},{"label":"128 Go","price":1199,"old_price":1549}]'::jsonb;

update public.products
  set price = 120000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"64 Go","price":120000}]'::jsonb) else variants end
  where slug = 'iphone-xs-occasion' and price = 749 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"64 Go","price":749}]'::jsonb;

update public.products
  set price = 220000, old_price = 300000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[{"label":"256 Go","price":220000,"old_price":300000}]'::jsonb) else variants end
  where slug = 'samsung-galaxy-s21-ultra-occasion' and price = 1399 and coalesce(variants -> 'storage', '[]'::jsonb) = '[{"label":"256 Go","price":1399,"old_price":1899}]'::jsonb;

update public.products
  set price = 145000, old_price = 160000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[]'::jsonb) else variants end
  where slug = 'airpods-pro-2' and price = 899 and coalesce(variants -> 'storage', '[]'::jsonb) = '[]'::jsonb;

update public.products
  set price = 30000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[]'::jsonb) else variants end
  where slug = 'ecouteurs-sans-fil-anc' and price = 189 and coalesce(variants -> 'storage', '[]'::jsonb) = '[]'::jsonb;

update public.products
  set price = 10000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[]'::jsonb) else variants end
  where slug = 'chargeur-rapide-usb-c-20w' and price = 79 and coalesce(variants -> 'storage', '[]'::jsonb) = '[]'::jsonb;

update public.products
  set price = 5000, old_price = null,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[]'::jsonb) else variants end
  where slug = 'coque-fibre-aramide' and price = 59 and coalesce(variants -> 'storage', '[]'::jsonb) = '[]'::jsonb;

update public.products
  set price = 55000, old_price = 65000,
      variants = case when variants ? 'storage' then jsonb_set(variants, '{storage}', '[]'::jsonb) else variants end
  where slug = 'casque-bluetooth' and price = 349 and coalesce(variants -> 'storage', '[]'::jsonb) = '[]'::jsonb;

-- --- 6. Création de commande : zones et paiement -----------------------------------
-- Remplace la version « gouvernorats ». Toujours appelée par le serveur seul
-- (service_role), toujours sans confiance envers le navigateur :
--   • prix relus en base (capacité par capacité), stock décrémenté atomiquement ;
--   • frais lus dans la zone ACTIVE choisie (p_customer.zone_id), livraison
--     offerte au-delà du seuil ; retrait en magasin gratuit ;
--   • mode de paiement accepté seulement s'il est activé dans les paramètres.
-- p_customer : { name, phone (8 chiffres), zone_id, city, address, note }
-- Erreurs : invalid_items, invalid_qty, product_unavailable, invalid_variant,
-- insufficient_stock, invalid_delivery, invalid_zone, invalid_payment.

drop function if exists public.place_order(jsonb, jsonb, text);

create or replace function public.place_order(p_customer jsonb, p_items jsonb, p_delivery text, p_payment text)
returns table (order_id uuid, order_number text, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_qty integer;
  v_price numeric;
  v_color text;
  v_storage text;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_region text;
  v_delivery jsonb;
  v_payment jsonb;
  v_free_from numeric;
  v_order public.orders%rowtype;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_items';
  end if;

  -- Mode de paiement : doit exister et être activé
  select value into v_payment from public.settings where key = 'payment';
  if not exists (
    select 1 from jsonb_array_elements(coalesce(v_payment -> 'methods', '[]'::jsonb)) m
    where m ->> 'id' = p_payment and coalesce((m ->> 'enabled')::boolean, false)
  ) then
    raise exception 'invalid_payment';
  end if;

  perform 1
    from public.products
    where id in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
    order by id
    for update;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'invalid_qty';
    end if;

    select * into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then
      raise exception 'product_unavailable';
    end if;

    v_color := nullif(v_item ->> 'color', '');
    v_storage := nullif(v_item ->> 'storage', '');

    v_price := v_product.price;
    if jsonb_array_length(coalesce(v_product.variants -> 'storage', '[]'::jsonb)) > 0 then
      select (s ->> 'price')::numeric into v_price
        from jsonb_array_elements(v_product.variants -> 'storage') s
        where s ->> 'label' = v_storage;
      if v_price is null then
        raise exception 'invalid_variant';
      end if;
    end if;

    if jsonb_array_length(coalesce(v_product.variants -> 'colors', '[]'::jsonb)) > 0
       and not exists (
         select 1 from jsonb_array_elements(v_product.variants -> 'colors') c where c ->> 'name' = v_color
       ) then
      raise exception 'invalid_variant';
    end if;

    update public.products set stock = stock - v_qty where id = v_product.id and stock >= v_qty;
    if not found then
      raise exception 'insufficient_stock' using detail = v_product.name;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'color', v_color,
      'storage', v_storage,
      'qty', v_qty,
      'price', round(v_price),
      'image', v_product.images[1]
    );
    v_subtotal := v_subtotal + round(v_price) * v_qty;
  end loop;

  -- Livraison
  select value into v_delivery from public.settings where key = 'delivery';
  if p_delivery = 'pickup' then
    if coalesce((v_delivery -> 'pickup' ->> 'enabled')::boolean, true) is not true then
      raise exception 'invalid_delivery';
    end if;
    v_fee := 0;
    v_region := coalesce(v_delivery -> 'pickup' ->> 'label', 'Retrait en magasin');
  elsif p_delivery = 'home' then
    select * into v_zone from public.delivery_zones where id = p_customer ->> 'zone_id' and is_active;
    if not found then
      raise exception 'invalid_zone';
    end if;
    v_fee := v_zone.fee;
    v_region := v_zone.name;
    v_free_from := (v_delivery ->> 'free_from')::numeric;
    if v_free_from is not null and v_subtotal >= v_free_from then
      v_fee := 0;
    end if;
  else
    raise exception 'invalid_delivery';
  end if;

  insert into public.orders (
    customer_name, phone, region, city, address, delivery_method, payment_method,
    items, subtotal, delivery_fee, total, note
  ) values (
    trim(p_customer ->> 'name'),
    p_customer ->> 'phone',
    v_region,
    coalesce(trim(p_customer ->> 'city'), ''),
    case when p_delivery = 'pickup' then '' else coalesce(trim(p_customer ->> 'address'), '') end,
    p_delivery,
    p_payment,
    v_lines,
    v_subtotal,
    v_fee,
    v_subtotal + v_fee,
    nullif(trim(p_customer ->> 'note'), '')
  )
  returning * into v_order;

  return query select v_order.id, v_order.number, v_order.total;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text) to service_role;


-- #############################################################################
-- # migrations/20261125000900_mobile_empire.sql
-- #############################################################################
-- =============================================================================
-- 9 · Personnalisation Mobile Empire : avis clients, paiement, infos magasin
-- =============================================================================
-- Rejouable. Ne remplace jamais une saisie du commerçant : les paramètres ne
-- sont modifiés que s'ils contiennent encore les valeurs d'exemple.

-- --- 1. Avis clients ------------------------------------------------------------
-- Gérés dans /admin/avis. Seuls les avis publiés sont visibles sur le site.
-- La table démarre VIDE : la section « Avis » de l'accueil reste masquée tant
-- que le commerçant n'a pas saisi de vrais avis (aucun faux avis en ligne).

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  city text not null default '' check (char_length(city) <= 60),
  rating smallint not null default 5 check (rating between 1 and 5),
  text text not null check (char_length(text) between 1 and 600),
  product text check (product is null or char_length(product) <= 80),
  is_published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_published_position_idx on public.reviews (is_published, position, created_at desc);

create or replace trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "reviews_insert_admin" on public.reviews;
create policy "reviews_insert_admin" on public.reviews
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin" on public.reviews
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin" on public.reviews
  for delete to authenticated
  using ((select public.is_admin()));

-- Droits au strict nécessaire (cf. migration 6) : lecture publique (filtrée par
-- la RLS), gestion complète par l'admin.
revoke all on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon;
grant select, insert, update, delete on table public.reviews to authenticated;
grant all on table public.reviews to service_role;

-- --- 2. Paiement : à la livraison uniquement pour l'instant -----------------------
-- Les autres modes restent configurés mais désactivés ; ils se réactivent dans
-- /admin/parametres. Uniquement si les modes sont encore ceux de l'exemple
-- (migration 8) : un réglage du commerçant n'est jamais touché.

update public.settings
  set value = jsonb_set(
    value,
    '{methods}',
    (select jsonb_agg(case when m ->> 'id' = 'cod' then m else jsonb_set(m, '{enabled}', 'false'::jsonb) end order by ord)
       from jsonb_array_elements(value -> 'methods') with ordinality as e(m, ord))
  )
  where key = 'payment'
    and value = '{
  "methods": [
    { "id": "cod", "label": "Paiement à la livraison", "account": "", "instructions": "Vous payez en espèces au livreur, après avoir vérifié le colis.", "enabled": true },
    { "id": "orange_money", "label": "Orange Money", "account": "+223 70 00 00 00", "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", "enabled": true },
    { "id": "moov_money", "label": "Moov Money", "account": "+223 60 00 00 00", "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", "enabled": true },
    { "id": "wave", "label": "Wave", "account": "+223 70 00 00 00", "instructions": "Nous vous envoyons le lien ou le numéro Wave par WhatsApp après confirmation.", "enabled": true },
    { "id": "sama_money", "label": "Sama Money", "account": "+223 70 00 00 00", "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", "enabled": true },
    { "id": "virement", "label": "Virement bancaire", "account": "", "instructions": "Nous vous envoyons nos coordonnées bancaires par WhatsApp après confirmation.", "enabled": true }
  ]
}'::jsonb;

-- --- 3. Magasin : coordonnées Mobile Empire ----------------------------------------
-- Champ par champ, seulement si la valeur est encore celle de l'exemple.
-- TODO client : confirmer le numéro WhatsApp (repris du premier numéro).

update public.settings
  set value = value
    || case when coalesce(value ->> 'name', 'Boutique Mobile') = 'Boutique Mobile' then '{ "name": "Mobile Empire" }'::jsonb else '{}'::jsonb end
    || case when value ->> 'whatsapp' in ('22370000000', '21600000000') then '{ "whatsapp": "22363515582" }'::jsonb else '{}'::jsonb end
    || case when value ->> 'phone' in ('+223 70 00 00 00', '+216 00 000 000') then '{ "phone": "+223 63 51 55 82" }'::jsonb else '{}'::jsonb end
    || case when value ? 'phones' then '{}'::jsonb else '{ "phones": ["+223 63 51 55 82", "+223 74 05 86 18"] }'::jsonb end
    || case when value ->> 'email' in ('contact@example.com', 'contact@example.tn') then '{ "email": "diarraousmane719@gmail.com" }'::jsonb else '{}'::jsonb end
    || case when value -> 'address' ->> 'street' in ('Rue 311, ACI 2000', 'Avenue Habib Bourguiba')
         then jsonb_build_object('address', jsonb_build_object('street', '', 'district', 'N''Tabacoro', 'city', 'Bamako')) else '{}'::jsonb end
    || case when value -> 'hours' in (
              '[{ "days": "Lundi – Samedi", "time": "08:30 – 20:00" }, { "days": "Dimanche", "time": "10:00 – 14:00" }]'::jsonb,
              '[{ "days": "Lundi – Samedi", "time": "09:00 – 20:00" }, { "days": "Dimanche", "time": "10:00 – 14:00" }]'::jsonb)
         then '{ "hours": [{ "days": "Tous les jours", "time": "8h – 21h" }] }'::jsonb else '{}'::jsonb end
    || case when value ? 'slogan' then '{}'::jsonb else '{ "slogan": "Vendre avec passion, servir avec excellence.", "since": 2018 }'::jsonb end
    || case when value ? 'social' then '{}'::jsonb
         else '{ "social": { "facebook": "https://www.facebook.com/share/14yBZGGk9Mi/?mibextid=wwXIfr", "tiktok": "https://www.tiktok.com/@mobile__empire" } }'::jsonb end
  where key = 'store';


-- #############################################################################
-- # migrations/20261125001000_facebook.sql
-- #############################################################################
-- =============================================================================
-- 10 · Mise à jour d'après la page Facebook de Mobile Empire
-- =============================================================================
-- Rejouable. Infos du magasin (clé « store ») modifiées seulement si elles
-- contiennent encore les valeurs posées par la migration 9 : une saisie du
-- commerçant n'est jamais écrasée.
-- TODO client : second numéro (73 92 31 35 ou 74 05 86 18) et horaires à confirmer.

update public.settings
  set value = value
    || case when value -> 'address' ->> 'street' = ''
         then jsonb_build_object('address', (value -> 'address') || jsonb_build_object('street', 'Près de l''école fondamentale'))
         else '{}'::jsonb end
    || case when value ? 'tagline' then '{}'::jsonb else '{ "tagline": "smartphone repair & E-commerce" }'::jsonb end
    || case when value ? 'description' then '{}'::jsonb
         else '{ "description": "Votre destination incontournable pour la réparation et la vente de matériel électronique à Bamako" }'::jsonb end
  where key = 'store';


-- #############################################################################
-- # migrations/20261125001100_storefront.sql
-- #############################################################################
-- =============================================================================
-- 11 · Site public branché sur la base : promotions et cadrage des photos
-- =============================================================================
-- Rejouable. Ajoute aux produits ce qui n'existait que dans data/products.ts :
--   tag            pastille libre (ex. « Promo »), affichée en or
--   free_delivery  livraison offerte : une commande qui contient ce produit
--                  ne paie pas la livraison (appliqué par place_order)
--   image_bg       couleur de fond (#rrggbb) : la photo est affichée en entier
--                  sur ce fond au lieu d'être recadrée ; null = recadrée
-- Tous modifiables dans /admin/produits.

alter table public.products add column if not exists tag text;
alter table public.products add column if not exists free_delivery boolean not null default false;
alter table public.products add column if not exists image_bg text;

alter table public.products drop constraint if exists products_tag_check;
alter table public.products add constraint products_tag_check check (tag is null or char_length(tag) between 1 and 24);
alter table public.products drop constraint if exists products_image_bg_check;
alter table public.products add constraint products_image_bg_check check (image_bg is null or image_bg ~ '^#[0-9a-fA-F]{6}$');

-- --- Création de commande : livraison offerte par produit ----------------------------
-- Identique à la migration 8, plus : si un produit de la commande a
-- free_delivery, la livraison à domicile est gratuite.

create or replace function public.place_order(p_customer jsonb, p_items jsonb, p_delivery text, p_payment text)
returns table (order_id uuid, order_number text, order_total numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product public.products%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_qty integer;
  v_price numeric;
  v_color text;
  v_storage text;
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_fee numeric := 0;
  v_region text;
  v_delivery jsonb;
  v_payment jsonb;
  v_free_from numeric;
  v_offered boolean := false; -- un produit « livraison offerte » dans la commande
  v_order public.orders%rowtype;
begin
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_items';
  end if;

  -- Mode de paiement : doit exister et être activé
  select value into v_payment from public.settings where key = 'payment';
  if not exists (
    select 1 from jsonb_array_elements(coalesce(v_payment -> 'methods', '[]'::jsonb)) m
    where m ->> 'id' = p_payment and coalesce((m ->> 'enabled')::boolean, false)
  ) then
    raise exception 'invalid_payment';
  end if;

  perform 1
    from public.products
    where id in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
    order by id
    for update;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'invalid_qty';
    end if;

    select * into v_product
      from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active;
    if not found then
      raise exception 'product_unavailable';
    end if;

    v_color := nullif(v_item ->> 'color', '');
    v_storage := nullif(v_item ->> 'storage', '');

    v_price := v_product.price;
    if jsonb_array_length(coalesce(v_product.variants -> 'storage', '[]'::jsonb)) > 0 then
      select (s ->> 'price')::numeric into v_price
        from jsonb_array_elements(v_product.variants -> 'storage') s
        where s ->> 'label' = v_storage;
      if v_price is null then
        raise exception 'invalid_variant';
      end if;
    end if;

    if jsonb_array_length(coalesce(v_product.variants -> 'colors', '[]'::jsonb)) > 0
       and not exists (
         select 1 from jsonb_array_elements(v_product.variants -> 'colors') c where c ->> 'name' = v_color
       ) then
      raise exception 'invalid_variant';
    end if;

    if v_product.free_delivery then
      v_offered := true;
    end if;

    update public.products set stock = stock - v_qty where id = v_product.id and stock >= v_qty;
    if not found then
      raise exception 'insufficient_stock' using detail = v_product.name;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'slug', v_product.slug,
      'name', v_product.name,
      'color', v_color,
      'storage', v_storage,
      'qty', v_qty,
      'price', round(v_price),
      'image', v_product.images[1]
    );
    v_subtotal := v_subtotal + round(v_price) * v_qty;
  end loop;

  -- Livraison
  select value into v_delivery from public.settings where key = 'delivery';
  if p_delivery = 'pickup' then
    if coalesce((v_delivery -> 'pickup' ->> 'enabled')::boolean, true) is not true then
      raise exception 'invalid_delivery';
    end if;
    v_fee := 0;
    v_region := coalesce(v_delivery -> 'pickup' ->> 'label', 'Retrait en magasin');
  elsif p_delivery = 'home' then
    select * into v_zone from public.delivery_zones where id = p_customer ->> 'zone_id' and is_active;
    if not found then
      raise exception 'invalid_zone';
    end if;
    v_fee := v_zone.fee;
    v_region := v_zone.name;
    v_free_from := (v_delivery ->> 'free_from')::numeric;
    if v_offered or (v_free_from is not null and v_subtotal >= v_free_from) then
      v_fee := 0;
    end if;
  else
    raise exception 'invalid_delivery';
  end if;

  insert into public.orders (
    customer_name, phone, region, city, address, delivery_method, payment_method,
    items, subtotal, delivery_fee, total, note
  ) values (
    trim(p_customer ->> 'name'),
    p_customer ->> 'phone',
    v_region,
    coalesce(trim(p_customer ->> 'city'), ''),
    case when p_delivery = 'pickup' then '' else coalesce(trim(p_customer ->> 'address'), '') end,
    p_delivery,
    p_payment,
    v_lines,
    v_subtotal,
    v_fee,
    v_subtotal + v_fee,
    nullif(trim(p_customer ->> 'note'), '')
  )
  returning * into v_order;

  return query select v_order.id, v_order.number, v_order.total;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text) to service_role;


-- #############################################################################
-- # migrations/20261125001200_order_history.sql
-- #############################################################################
-- =============================================================================
-- 12 · Historique des statuts de commande (qui et quand)
-- =============================================================================
-- Rejouable. Chaque création de commande et chaque changement de statut est
-- journalisé par un déclencheur, côté base : l'historique ne dépend pas du code
-- de l'admin et ne peut pas être falsifié depuis l'API.
--   changed_by        identifiant de l'admin (auth.uid()), null pour le site
--   changed_by_email  e-mail lu dans le jeton de session, figé au moment du
--                     changement (lisible même si le compte est supprimé)

create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid,
  changed_by_email text check (changed_by_email is null or char_length(changed_by_email) <= 320),
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- --- Journalisation ----------------------------------------------------------------
-- security definer : le déclencheur écrit dans la table alors qu'aucun rôle de
-- l'API n'a le droit d'y insérer.

create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, created_at)
    values (new.id, null, new.status, new.created_at);
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_email)
    values (new.id, old.status, new.status, (select auth.uid()), v_claims ->> 'email');
  end if;
  return null;
end;
$$;

revoke all on function public.log_order_status() from public, anon, authenticated;

drop trigger if exists orders_status_history on public.orders;
create trigger orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- Commandes antérieures : une ligne « création », plus l'état actuel s'il a changé
-- (auteur et date exacts inconnus). Seulement pour les commandes sans historique.
insert into public.order_status_history (order_id, from_status, to_status, created_at)
select o.id, null, 'nouvelle', o.created_at
from public.orders o
where not exists (select 1 from public.order_status_history h where h.order_id = o.id);

insert into public.order_status_history (order_id, from_status, to_status, created_at)
select o.id, 'nouvelle', o.status, o.updated_at
from public.orders o
where o.status <> 'nouvelle'
  and (select count(*) from public.order_status_history h where h.order_id = o.id) = 1;

-- --- Droits : lecture admin uniquement, aucune écriture via l'API ----------------------

alter table public.order_status_history enable row level security;

drop policy if exists "order_status_history_select_admin" on public.order_status_history;
create policy "order_status_history_select_admin" on public.order_status_history
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.order_status_history from anon, authenticated;
grant select on table public.order_status_history to authenticated;
grant all on table public.order_status_history to service_role;


-- #############################################################################
-- # seed.sql
-- #############################################################################
-- Généré par scripts/generate-seed.ts depuis data/products.ts : ne pas modifier à la main.
-- Produits et catégories d'exemple : photos du client (public/photos) ou visuels provisoires.
-- Nécessite la migration 11 (colonnes tag, free_delivery, image_bg).

insert into public.categories (name, slug, description, image, position) values
  ('Smartphones', 'smartphones', 'Samsung, Tecno et autres marques.', '/photos/provisoire/smartphones.svg', 0),
  ('Écouteurs et casques', 'ecouteurs-casques', 'Écouteurs sans fil et casques Bluetooth.', '/photos/casque-anc-yesido-640.webp', 1),
  ('Montres connectées', 'montres', 'Montres connectées pour tous les jours.', '/photos/montre-yesido-io22-600.webp', 2),
  ('Chargeurs et câbles', 'accessoires', 'Chargeurs, chargeurs sans fil et câbles.', '/photos/station-charge-3en1-627.webp', 3),
  ('Coques et protections', 'protections', 'Coques et protections d''écran.', '/photos/provisoire/protections.svg', 4),
  ('Gadgets', 'gadgets', 'Loupes d''écran et petits accessoires malins.', '/photos/provisoire/gadgets.svg', 5)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Smartphone Samsung Galaxy', 'smartphone-samsung', 'Smartphone Samsung neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.', (select id from public.categories where slug = 'smartphones'), 'Samsung', 100000, null, 5, 'neuf', null, null, false, true, true, null, false, null, array['/photos/provisoire/smartphones.svg']::text[], '{}'::jsonb, array['Modèle et capacité à préciser']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Smartphone Tecno', 'smartphone-tecno', 'Smartphone Tecno neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.', (select id from public.categories where slug = 'smartphones'), 'Tecno', 80000, null, 5, 'neuf', null, null, false, false, true, null, false, null, array['/photos/provisoire/smartphones.svg']::text[], '{}'::jsonb, array['Modèle et capacité à préciser']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Casque Bluetooth Super Bass', 'casque-bluetooth-super-bass', 'Casque Bluetooth aux basses renforcées, en promotion avec la livraison offerte.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 10000, null, 10, 'neuf', null, null, false, true, true, 'Promo', true, null, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, array['Bluetooth', 'Super Bass', 'Livraison offerte']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Casque Bluetooth ANC Yesido', 'casque-bluetooth-anc-yesido', 'Casque Bluetooth Yesido à réduction de bruit active.', (select id from public.categories where slug = 'ecouteurs-casques'), 'Yesido', 25000, null, 5, 'neuf', null, null, false, true, true, null, false, '#ffffff', array['/photos/casque-anc-yesido-640.webp']::text[], '{}'::jsonb, array['Réduction de bruit active (ANC)', 'Bluetooth']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Écouteurs à conduction d''air Yesido', 'ecouteurs-conduction-air-yesido', 'Le son sans rien dans l''oreille, dans un format léger.', (select id from public.categories where slug = 'ecouteurs-casques'), 'Yesido', 15000, null, 5, 'neuf', null, null, true, true, true, null, false, null, array['/photos/ecouteurs-conduction-yesido-640.webp']::text[], '{}'::jsonb, array['Hors de l''oreille', 'Bluetooth 5.3', '10 h d''autonomie']::text[], '[["Type","Conduction d''air, hors de l''oreille"],["Connexion","Bluetooth 5.3"],["Autonomie","10 h"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Écouteurs sans fil', 'ecouteurs-sans-fil', 'Écouteurs sans fil avec leur boîtier de charge. Demandez-nous les modèles et coloris disponibles.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 15000, null, 10, 'neuf', null, null, false, false, true, null, false, null, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Casque ANC EP07', 'casque-anc-ep07', 'Casque à réduction de bruit active : coupez-vous du bruit et profitez de votre musique.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 20000, null, 10, 'neuf', null, null, false, false, true, null, false, null, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, array['Réduction de bruit 35 dB', 'Bluetooth 5.3', 'Jusqu''à 60 h d''autonomie']::text[], '[["Connexion","Bluetooth 5.3"],["Réduction de bruit","Active (ANC), jusqu''à 35 dB"],["Autonomie sans ANC","50 à 60 h"],["Autonomie avec ANC","30 à 40 h"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Montre connectée Yesido IO22', 'montre-connectee-yesido-io22', 'Une montre connectée légère et moderne : santé, sport et notifications au poignet, jusqu''à 5 jours sans recharge.', (select id from public.categories where slug = 'montres'), 'Yesido', 25000, null, 8, 'neuf', null, null, true, true, true, null, false, '#ffffff', array['/photos/montre-yesido-io22-600.webp']::text[], '{}'::jsonb, array['Deux bracelets', 'Jusqu''à 5 jours d''autonomie', 'Résistante à l''eau IP67']::text[], '[["Écran","Tactile HD, haute résolution, lisible même en plein soleil"],["Santé","Fréquence cardiaque, sommeil, pas et calories brûlées, entraînement multisports"],["Notifications","Appels, SMS et réseaux sociaux (WhatsApp, Facebook…)"],["Connexion","Bluetooth, compatible iOS et Android"],["Autonomie","Jusqu''à 5 jours d''utilisation, 30 jours en veille"],["Bracelet","Silicone ou métal, deux couleurs"],["Étanchéité","IP67"],["Autres","Contrôle de la musique, rappel de sédentarité, chronomètre et alarmes, localisation du téléphone"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Station de charge sans fil 3 en 1', 'station-charge-sans-fil-3-en-1', 'Rechargez plusieurs appareils au même endroit, montre comprise, sur une seule station. Vérifiez avec nous la compatibilité avec vos appareils.', (select id from public.categories where slug = 'accessoires'), '', 15000, null, 5, 'neuf', null, null, false, true, true, null, false, '#ffffff', array['/photos/station-charge-3en1-627.webp']::text[], '{}'::jsonb, array['Charge sans fil', 'Support de montre', '3 en 1']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Mini batterie porte-clés', 'mini-batterie-porte-cles', 'Une batterie d''appoint qui tient sur votre trousseau de clés, pour Android comme pour iPhone.', (select id from public.categories where slug = 'accessoires'), '', 7500, null, 12, 'neuf', null, null, false, false, true, null, false, '#d9ebf5', array['/photos/batterie-porte-cles-640.webp']::text[], '{"colors":[{"name":"Noir / rouge","hex":"#9b2c33"},{"name":"Noir / argent","hex":"#2b2d31"},{"name":"Blanc","hex":"#f2f2f0"},{"name":"Rose","hex":"#f2c9cc"}]}'::jsonb, array['USB-C + Lightning', 'Format porte-clés', '4 coloris']::text[], '[["Connecteurs","USB-C et Lightning intégrés"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, tag, free_delivery, image_bg, images, variants, highlights, specs)
select 'Loupe d''écran', 'loupe-ecran', 'Loupe d''écran pour smartphone : l''image de votre téléphone en plus grand, pour vos vidéos.', (select id from public.categories where slug = 'gadgets'), '', 7000, null, 10, 'neuf', null, null, false, false, true, null, false, null, array['/photos/provisoire/gadgets.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

commit;
