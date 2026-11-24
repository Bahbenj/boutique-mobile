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
