-- =============================================================================
-- 20 · Équipe : rôles Propriétaire, Gérant, Vendeur
-- =============================================================================
-- Rejouable.
--   admins.role   owner   (propriétaire) : tout, et seul à gérer l'équipe ;
--                 manager (gérant)       : tout, sauf l'équipe ;
--                 seller  (vendeur)      : commandes, réparations, stock.
-- Les comptes déjà présents deviennent propriétaires (défaut 'owner' : une
-- ligne ajoutée à la main dans le SQL Editor, comme au README étape 3, aussi).
--   is_admin()  = propriétaire ou gérant : toutes les règles existantes restent
--                 donc fermées aux vendeurs ;
--   is_staff()  = toute l'équipe : ouvre seulement commandes, réparations, stock ;
--   is_owner()  = propriétaire.
-- Gestion de l'équipe : fonctions owner_* (security definer, propriétaire seul).
-- Les propriétaires ne se modifient et ne se retirent que dans le SQL Editor.

alter table public.admins add column if not exists role text not null default 'owner';
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('owner', 'manager', 'seller'));

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.admins where user_id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role in ('owner', 'manager'));
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'owner');
$$;

revoke all on function public.staff_role(), public.is_staff(), public.is_admin(), public.is_owner() from public;
grant execute on function public.staff_role(), public.is_staff(), public.is_admin(), public.is_owner() to anon, authenticated;

-- --- Vendeurs : commandes, réparations, stock ------------------------------------------

drop policy if exists "orders_select_admin" on public.orders;
create policy "orders_select_admin" on public.orders
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists "order_status_history_select_admin" on public.order_status_history;
create policy "order_status_history_select_admin" on public.order_status_history
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "repair_requests_select_admin" on public.repair_requests;
create policy "repair_requests_select_admin" on public.repair_requests
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "repair_requests_update_admin" on public.repair_requests;
create policy "repair_requests_update_admin" on public.repair_requests
  for update to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

drop policy if exists "stock_movements_select_admin" on public.stock_movements;
create policy "stock_movements_select_admin" on public.stock_movements
  for select to authenticated
  using ((select public.is_staff()));

-- Lecture de tous les produits et catégories (page Stock), sans droit d'écriture
drop policy if exists "products_select_staff" on public.products;
create policy "products_select_staff" on public.products
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists "categories_select_staff" on public.categories;
create policy "categories_select_staff" on public.categories
  for select to authenticated
  using ((select public.is_staff()));

-- Ajustement du stock : toute l'équipe, et seulement la colonne stock.
-- security definer (les vendeurs n'ont aucun droit d'écriture sur products).
create or replace function public.admin_set_stock(p_product uuid, p_stock integer, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_stock is null or p_stock < 0 or p_stock > 100000 then
    raise exception 'invalid_stock';
  end if;
  perform set_config('app.stock_note', coalesce(left(trim(p_note), 200), ''), true);
  update public.products set stock = p_stock where id = p_product;
  if not found then
    raise exception 'not_found';
  end if;
  perform set_config('app.stock_note', '', true);
  return p_stock;
end;
$$;

revoke all on function public.admin_set_stock(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.admin_set_stock(uuid, integer, text) to authenticated;

-- --- Gestion de l'équipe (propriétaire) -------------------------------------------------

create or replace function public.owner_team()
returns table (user_id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, a.role, a.created_at, u.last_sign_in_at, a.user_id = auth.uid()
    from public.admins a
    join auth.users u on u.id = a.user_id
    order by case a.role when 'owner' then 0 when 'manager' then 1 else 2 end, a.created_at;
end;
$$;

-- Ajoute (ou change le rôle d') un compte existant, retrouvé par son e-mail.
create or replace function public.owner_add_member(p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('manager', 'seller') then
    raise exception 'invalid_role';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'user_not_found';
  end if;
  if exists (select 1 from public.admins where user_id = v_user and role = 'owner') then
    raise exception 'is_owner';
  end if;
  insert into public.admins (user_id, role) values (v_user, p_role)
  on conflict (user_id) do update set role = excluded.role;
  return v_user;
end;
$$;

create or replace function public.owner_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('manager', 'seller') then
    raise exception 'invalid_role';
  end if;
  update public.admins set role = p_role where user_id = p_user and role <> 'owner';
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

create or replace function public.owner_remove_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.admins where user_id = p_user and role <> 'owner';
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function public.owner_team(), public.owner_add_member(text, text), public.owner_set_role(uuid, text), public.owner_remove_member(uuid)
  from public, anon, authenticated;
grant execute on function public.owner_team(), public.owner_add_member(text, text), public.owner_set_role(uuid, text), public.owner_remove_member(uuid)
  to authenticated;

-- --- Infos de la boutique : lien Google Maps (itinéraire) -------------------------------
update public.settings
  set value = value || '{ "map_url": "https://maps.google.com/?q=N%27Tabacoro%2C+Bamako%2C+Mali" }'::jsonb
  where key = 'store' and not (value ? 'map_url');
