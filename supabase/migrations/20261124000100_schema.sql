-- =============================================================================
-- 1/4 · Schéma : tables, types, contraintes, index
-- =============================================================================

-- --- Types -------------------------------------------------------------------

create type public.product_condition as enum ('neuf', 'occasion', 'reconditionne');

create type public.order_status as enum ('nouvelle', 'confirmee', 'expediee', 'livree', 'annulee');

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

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- --- Catégories ---------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 300),
  image text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_position_idx on public.categories (position);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- --- Produits -----------------------------------------------------------------
-- variants : { "colors": [{ "name", "hex" }], "storage": [{ "label", "price", "old_price" }] }
-- specs    : [["Écran", "6,1″ OLED"], ...]
-- Prix en dinars (3 décimales = millimes).

create table public.products (
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

create index products_category_idx on public.products (category_id);
create index products_active_featured_idx on public.products (is_active, is_featured);
create index products_stock_idx on public.products (stock) where is_active;

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- --- Commandes ----------------------------------------------------------------
-- items : snapshot des lignes au moment de la commande (nom, variante, prix
-- recalculé côté serveur, quantité), indépendant des modifications futures.

create sequence public.order_number_seq start with 1001;

create table public.orders (
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

create index orders_created_idx on public.orders (created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- --- Paramètres (clé / valeur) --------------------------------------------------
-- Clés utilisées : store, delivery, announcement (voir la migration 4).

create table public.settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();
