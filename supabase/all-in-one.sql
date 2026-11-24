-- =============================================================================
-- TOUT-EN-UN · généré par scripts/build-all-in-one.mjs : ne pas modifier à la main.
-- Contenu : migrations/20261124000100_schema.sql, migrations/20261124000200_security.sql, migrations/20261124000300_orders.sql, migrations/20261124000400_storage_settings.sql, migrations/20261124000500_storage_admin_select.sql, migrations/20261124000600_grants.sql, seed.sql.
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
-- # seed.sql
-- #############################################################################
-- Généré par scripts/generate-seed.ts depuis data/products.ts : ne pas modifier à la main.
-- Produits et catégories d'exemple (photos Unsplash de remplacement).

insert into public.categories (name, slug, description, image, position) values
  ('Téléphones neufs', 'neufs', 'Scellés, facturés, garantis 12 mois.', 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=1200&q=80', 0),
  ('Téléphones d''occasion', 'occasion', 'Testés sur 30 points, garantis 3 mois.', 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=1200&q=80', 1),
  ('Accessoires', 'accessoires', 'Écouteurs, chargeurs, coques et protections.', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1200&q=80', 2)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'iPhone 15 Pro', 'iphone-15-pro', 'Le plus léger des iPhone Pro, avec un châssis en titane et la puce A17 Pro. Neuf, scellé, livré avec facture.', (select id from public.categories where slug = 'neufs'), 'Apple', 4799, null, 6, 'neuf', null, null, true, true, true, array['https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1617997455403-41f333d44d5b?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Titane naturel","hex":"#8f8a81"},{"name":"Titane noir","hex":"#3b3b3d"},{"name":"Titane bleu","hex":"#3f4a5a"}],"storage":[{"label":"128 Go","price":4799},{"label":"256 Go","price":5299},{"label":"512 Go","price":6199}]}'::jsonb, array['Puce A17 Pro', 'Châssis en titane', 'Triple caméra 48 Mpx', 'USB-C']::text[], '[["Écran","6,1″ Super Retina XDR, 120 Hz"],["Puce","A17 Pro"],["Caméras","48 + 12 + 12 Mpx, zoom optique 3×"],["Batterie","Jusqu''à 23 h de vidéo"],["Connecteur","USB-C (USB 3)"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Le Galaxy le plus complet : S Pen intégré, zoom 100× et écran anti-reflets. Neuf, scellé, version internationale.', (select id from public.categories where slug = 'neufs'), 'Samsung', 4399, 4699, 4, 'neuf', null, null, false, true, true, array['https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Titanium Black","hex":"#2b2b2b"},{"name":"Titanium Gray","hex":"#8a8a86"}],"storage":[{"label":"256 Go","price":4399,"old_price":4699},{"label":"512 Go","price":4899,"old_price":5199}]}'::jsonb, array['S Pen intégré', 'Zoom 100×', 'Écran 6,8″ 120 Hz', 'Galaxy AI']::text[], '[["Écran","6,8″ Dynamic AMOLED 2X, 120 Hz"],["Processeur","Snapdragon 8 Gen 3 for Galaxy"],["Caméras","200 + 50 + 12 + 10 Mpx"],["Batterie","5 000 mAh, charge 45 W"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'iPhone 13', 'iphone-13', 'Un iPhone fiable et rapide au meilleur prix. Neuf, scellé, garanti 12 mois.', (select id from public.categories where slug = 'neufs'), 'Apple', 2499, null, 9, 'neuf', null, null, false, true, true, array['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Minuit","hex":"#1f2328"},{"name":"Lumière stellaire","hex":"#ece6dc"},{"name":"Bleu","hex":"#2f4f6b"}],"storage":[{"label":"128 Go","price":2499},{"label":"256 Go","price":2899}]}'::jsonb, array['Puce A15 Bionic', 'Double caméra 12 Mpx', 'Mode Cinématique']::text[], '[["Écran","6,1″ Super Retina XDR"],["Puce","A15 Bionic"],["Caméras","12 + 12 Mpx"],["Batterie","Jusqu''à 19 h de vidéo"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Galaxy A55 5G', 'samsung-galaxy-a55', 'Le milieu de gamme le plus complet de Samsung : 5G, écran fluide et grosse batterie.', (select id from public.categories where slug = 'neufs'), 'Samsung', 1349, null, 12, 'neuf', null, null, false, true, true, array['https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Bleu nuit","hex":"#1e2a44"},{"name":"Lilas","hex":"#c9b8e0"}],"storage":[{"label":"128 Go","price":1349},{"label":"256 Go","price":1549}]}'::jsonb, array['5G', 'Écran 120 Hz', 'Batterie 5 000 mAh', 'Résistant à l''eau IP67']::text[], '[["Écran","6,6″ Super AMOLED, 120 Hz"],["Processeur","Exynos 1480"],["Caméras","50 + 12 + 5 Mpx"],["Batterie","5 000 mAh, charge 25 W"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Redmi Note 13 Pro', 'xiaomi-redmi-note-13-pro', 'Une caméra 200 Mpx et la charge rapide 67 W à prix doux. Neuf, scellé, garanti 12 mois.', (select id from public.categories where slug = 'neufs'), 'Xiaomi', 1099, 1199, 15, 'neuf', null, null, false, true, true, array['https://images.unsplash.com/photo-1621330396173-e41b1cafd17f?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Noir","hex":"#1c1c1c"},{"name":"Bleu glacier","hex":"#a9c7d8"}],"storage":[{"label":"256 Go","price":1099,"old_price":1199},{"label":"512 Go","price":1299,"old_price":1399}]}'::jsonb, array['Caméra 200 Mpx', 'Écran AMOLED 120 Hz', 'Charge 67 W']::text[], '[["Écran","6,67″ AMOLED, 120 Hz"],["Processeur","Snapdragon 7s Gen 2"],["Caméras","200 + 8 + 2 Mpx"],["Batterie","5 100 mAh, charge 67 W"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'iPhone 12 Pro', 'iphone-12-pro-occasion', 'Contrôlé, nettoyé et réinitialisé en magasin. Livré avec un câble de charge et un verre trempé posé.', (select id from public.categories where slug = 'occasion'), 'Apple', 1699, 2199, 3, 'occasion', 'Très bon état', 88, false, true, true, array['https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Bleu Pacifique","hex":"#2f4f63"}],"storage":[{"label":"128 Go","price":1699,"old_price":2199},{"label":"256 Go","price":1899,"old_price":2399}]}'::jsonb, array['Testé sur 30 points', 'Batterie 88 %', 'Débloqué tout opérateur']::text[], '[["Écran","6,1″ Super Retina XDR"],["Puce","A14 Bionic"],["Caméras","12 + 12 + 12 Mpx, LiDAR"],["État","Très bon état : micro-rayures invisibles à 20 cm"],["Garantie","3 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'iPhone 11', 'iphone-11-occasion', 'Le premier iPhone idéal pour un budget serré. Contrôlé en magasin, garanti 3 mois.', (select id from public.categories where slug = 'occasion'), 'Apple', 1049, 1399, 5, 'occasion', 'Comme neuf', 91, false, true, true, array['https://images.unsplash.com/photo-1591337676887-a217a6970a8a?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Blanc","hex":"#f1f0ec"}],"storage":[{"label":"64 Go","price":1049,"old_price":1399},{"label":"128 Go","price":1199,"old_price":1549}]}'::jsonb, array['Testé sur 30 points', 'Batterie 91 %', 'Aucune rayure']::text[], '[["Écran","6,1″ Liquid Retina"],["Puce","A13 Bionic"],["Caméras","12 + 12 Mpx"],["État","Comme neuf : aucune trace d''usage"],["Garantie","3 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'iPhone XS', 'iphone-xs-occasion', 'Un iPhone compact à petit prix, idéal en premier smartphone ou en téléphone de secours.', (select id from public.categories where slug = 'occasion'), 'Apple', 749, null, 0, 'occasion', 'Bon état', 84, false, false, true, array['https://images.unsplash.com/photo-1567581935884-3349723552ca?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Gris sidéral","hex":"#3a3a3c"}],"storage":[{"label":"64 Go","price":749}]}'::jsonb, array['Testé sur 30 points', 'Batterie 84 %', 'Écran OLED']::text[], '[["Écran","5,8″ Super Retina OLED"],["Puce","A12 Bionic"],["État","Bon état : rayures légères sur le châssis"],["Garantie","3 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Galaxy S21 Ultra', 'samsung-galaxy-s21-ultra-occasion', 'L''ancien haut de gamme de Samsung, toujours redoutable en photo. Contrôlé et garanti 3 mois.', (select id from public.categories where slug = 'occasion'), 'Samsung', 1399, 1899, 1, 'occasion', 'Très bon état', 86, false, false, true, array['https://images.unsplash.com/photo-1610792516307-ea5acd9c3b00?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Phantom Black","hex":"#1d1d1f"}],"storage":[{"label":"256 Go","price":1399,"old_price":1899}]}'::jsonb, array['Testé sur 30 points', 'Zoom 100×', 'Écran 120 Hz']::text[], '[["Écran","6,8″ Dynamic AMOLED 2X, 120 Hz"],["Caméras","108 + 12 + 10 + 10 Mpx"],["État","Très bon état"],["Garantie","3 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'AirPods Pro (2e gén.)', 'airpods-pro-2', 'Réduction de bruit deux fois plus efficace et mode Transparence adaptatif. Neufs, scellés.', (select id from public.categories where slug = 'accessoires'), 'Apple', 899, 999, 8, 'neuf', null, null, false, true, true, array['https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80']::text[], '{}'::jsonb, array['Réduction de bruit active', 'Boîtier USB-C', 'Audio spatial']::text[], '[["Autonomie","6 h (30 h avec le boîtier)"],["Charge","USB-C, MagSafe, Qi"],["Résistance","IP54"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Écouteurs sans fil ANC', 'ecouteurs-sans-fil-anc', 'La réduction de bruit sans se ruiner, compatible iPhone et Android.', (select id from public.categories where slug = 'accessoires'), 'Soundcore', 189, null, 20, 'neuf', null, null, false, false, true, array['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Noir","hex":"#1c1c1c"},{"name":"Blanc","hex":"#f2f2f2"}]}'::jsonb, array['Réduction de bruit', '40 h d''autonomie', 'Bluetooth 5.3']::text[], '[["Autonomie","10 h (40 h avec le boîtier)"],["Connexion","Bluetooth 5.3"],["Garantie","6 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Chargeur rapide USB-C 20 W', 'chargeur-rapide-usb-c-20w', 'Le chargeur officiel pour recharger un iPhone à 50 % en 30 minutes environ.', (select id from public.categories where slug = 'accessoires'), 'Apple', 79, null, 40, 'neuf', null, null, false, false, true, array['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=1200&q=80']::text[], '{}'::jsonb, array['Charge rapide 50 % en 30 min', 'Compatible iPhone 8 et +']::text[], '[["Puissance","20 W"],["Connecteur","USB-C"],["Garantie","6 mois"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Coque fibre aramide', 'coque-fibre-aramide', 'Ultra fine et résistante, pour protéger sans alourdir.', (select id from public.categories where slug = 'accessoires'), 'Boutique', 59, null, 25, 'neuf', null, null, false, false, true, array['https://images.unsplash.com/photo-1601593346740-925612772716?auto=format&fit=crop&w=1200&q=80']::text[], '{"colors":[{"name":"Noir carbone","hex":"#222"}]}'::jsonb, array['0,6 mm d''épaisseur', 'Compatible MagSafe', 'Pose offerte en magasin']::text[], '[["Matière","Fibre aramide"],["Modèles","iPhone 12 à 15 (préciser à la commande)"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Casque Bluetooth', 'casque-bluetooth', 'Un casque léger et endurant pour la musique et les appels.', (select id from public.categories where slug = 'accessoires'), 'Sony', 349, 399, 6, 'neuf', null, null, false, false, true, array['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80']::text[], '{}'::jsonb, array['50 h d''autonomie', 'Charge rapide', 'Appels mains libres']::text[], '[["Autonomie","50 h"],["Connexion","Bluetooth 5.2"],["Garantie","12 mois"]]'::jsonb
on conflict (slug) do nothing;

commit;
