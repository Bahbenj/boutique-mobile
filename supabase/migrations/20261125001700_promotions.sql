-- =============================================================================
-- 17 · Promotions et codes promo
-- =============================================================================
-- Rejouable.
--   promotions   remise en % ou en FCFA sur un produit, une catégorie ou tout le
--                site, avec dates facultatives. Lisible par le public (le site
--                affiche les prix remisés), modifiable par l'admin seul.
--   promo_codes  codes saisis par le client (ex. BIENVENUE10) : % ou montant,
--                minimum de commande, nombre d'utilisations, expiration.
--                Jamais lisibles par le public : vérifiés par place_order et
--                check_promo_code (clé de service uniquement).
-- Règle de prix (identique dans lib/catalog.ts) : prix de base = capacité choisie
-- ou prix normal ; prix payé = le plus bas entre la promo du produit et la
-- meilleure promotion en cours (pas de cumul). Pourcentage arrondi aux 5 FCFA.
-- Commandes : promo_code et discount ; total = sous-total − remise + livraison.

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('percent', 'amount')),
  value numeric(12, 0) not null check (value > 0),
  scope text not null check (scope in ('all', 'category', 'product')),
  category_id uuid references public.categories (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promotions_percent_check check (kind <> 'percent' or value <= 90),
  constraint promotions_target_check check (
    (scope = 'all' and category_id is null and product_id is null)
    or (scope = 'category' and category_id is not null and product_id is null)
    or (scope = 'product' and product_id is not null and category_id is null)
  ),
  constraint promotions_dates_check check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists promotions_active_idx on public.promotions (is_active, ends_at);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  kind text not null check (kind in ('percent', 'amount')),
  value numeric(12, 0) not null check (value > 0),
  min_order numeric(12, 0) not null default 0 check (min_order >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promo_codes_percent_check check (kind <> 'percent' or value <= 90),
  constraint promo_codes_dates_check check (starts_at is null or expires_at is null or expires_at > starts_at)
);

alter table public.orders add column if not exists promo_code text check (promo_code is null or char_length(promo_code) <= 30);
alter table public.orders add column if not exists discount numeric(10, 3) not null default 0 check (discount >= 0);
create index if not exists orders_promo_code_idx on public.orders (promo_code) where promo_code is not null;

-- --- Sécurité ------------------------------------------------------------------------

alter table public.promotions enable row level security;
alter table public.promo_codes enable row level security;

drop policy if exists "promotions_select_public" on public.promotions;
create policy "promotions_select_public" on public.promotions
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "promotions_insert_admin" on public.promotions;
create policy "promotions_insert_admin" on public.promotions
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "promotions_update_admin" on public.promotions;
create policy "promotions_update_admin" on public.promotions
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "promotions_delete_admin" on public.promotions;
create policy "promotions_delete_admin" on public.promotions
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "promo_codes_admin" on public.promo_codes;
create policy "promo_codes_admin" on public.promo_codes
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.promotions, public.promo_codes from public, anon, authenticated;
grant select on table public.promotions to anon;
grant select, insert, update, delete on table public.promotions, public.promo_codes to authenticated;
grant all on table public.promotions, public.promo_codes to service_role;

-- --- Prix après promotion ------------------------------------------------------------

create or replace function public.promo_discounted(p_base numeric, p_kind text, p_value numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_kind = 'percent' then round(p_base * (100 - p_value) / 100 / 5) * 5
    else p_base - p_value
  end;
$$;

-- Meilleur prix d'un produit parmi les promotions en cours (p_base si aucune).
create or replace function public.campaign_price(p public.products, p_base numeric)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(min(d.price), p_base)
  from (
    select public.promo_discounted(p_base, pr.kind, pr.value) as price
    from public.promotions pr
    where pr.is_active
      and (pr.starts_at is null or pr.starts_at <= now())
      and (pr.ends_at is null or pr.ends_at > now())
      and (pr.scope = 'all'
           or (pr.scope = 'category' and pr.category_id = p.category_id)
           or (pr.scope = 'product' and pr.product_id = p.id))
  ) d
  where d.price > 0 and d.price < p_base;
$$;

revoke all on function public.promo_discounted(numeric, text, numeric) from public, anon, authenticated;
revoke all on function public.campaign_price(public.products, numeric) from public, anon, authenticated;
grant execute on function public.promo_discounted(numeric, text, numeric) to service_role;
grant execute on function public.campaign_price(public.products, numeric) to service_role;

-- --- Vérification d'un code depuis le panier (clé de service) -------------------------
-- Renvoie le type, la valeur et le minimum (le panier calcule la remise affichée) ;
-- place_order refait toutes les vérifications au moment de la commande.

create or replace function public.check_promo_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_pc public.promo_codes%rowtype;
begin
  select * into v_pc from public.promo_codes where code = v_code;
  if not found or not v_pc.is_active or (v_pc.starts_at is not null and v_pc.starts_at > now()) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if v_pc.expires_at is not null and v_pc.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if v_pc.max_uses is not null
     and (select count(*) from public.orders o where o.promo_code = v_code and o.status <> 'annulee') >= v_pc.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;
  return jsonb_build_object('ok', true, 'code', v_pc.code, 'kind', v_pc.kind, 'value', v_pc.value, 'min_order', v_pc.min_order);
end;
$$;

revoke all on function public.check_promo_code(text) from public, anon, authenticated;
grant execute on function public.check_promo_code(text) to service_role;

-- --- Création de commande : promotions et code promo ---------------------------------
-- Identique à la migration 16, plus : promotions en cours, code promo
-- (p_customer.promo_code), colonnes promo_code et discount.

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
  v_base numeric;
  v_code text;
  v_pc public.promo_codes%rowtype;
  v_discount numeric := 0;
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
      from public.products p
      where p.id = (v_item ->> 'product_id')::uuid and p.is_active
        and (p.category_id is null
             or exists (select 1 from public.categories c where c.id = p.category_id and c.is_active));
    if not found then
      raise exception 'product_unavailable';
    end if;

    v_color := nullif(v_item ->> 'color', '');
    v_storage := nullif(v_item ->> 'storage', '');

    -- Prix : capacité choisie, sinon prix promo s'il est en cours, sinon prix normal
    v_price := public.product_current_price(v_product);
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

    -- Promotion (produit, catégorie ou tout le site) : le meilleur prix l'emporte, sans cumul
    v_base := case when jsonb_array_length(coalesce(v_product.variants -> 'storage', '[]'::jsonb)) > 0
                   then v_price else v_product.price end;
    if v_base is not null and v_base > 0 then
      v_price := least(v_price, public.campaign_price(v_product, v_base));
    end if;

    -- Produit sans prix (« Prix à renseigner ») : jamais vendu
    if v_price is null or v_price <= 0 then
      raise exception 'product_unavailable';
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

  -- Code promo (facultatif) : vérifié ici, jamais calculé par le navigateur.
  -- Utilisations = commandes non annulées portant ce code (annuler rend l'utilisation).
  v_code := upper(nullif(trim(coalesce(p_customer ->> 'promo_code', '')), ''));
  if v_code is not null then
    select * into v_pc from public.promo_codes where code = v_code for update;
    if not found or not v_pc.is_active or (v_pc.starts_at is not null and v_pc.starts_at > now()) then
      raise exception 'promo_code_invalid';
    end if;
    if v_pc.expires_at is not null and v_pc.expires_at <= now() then
      raise exception 'promo_code_expired';
    end if;
    if v_subtotal < v_pc.min_order then
      raise exception 'promo_code_min_order' using detail = v_pc.min_order::text;
    end if;
    if v_pc.max_uses is not null
       and (select count(*) from public.orders o where o.promo_code = v_code and o.status <> 'annulee') >= v_pc.max_uses then
      raise exception 'promo_code_used_up';
    end if;
    v_discount := case v_pc.kind
      when 'percent' then round(v_subtotal * v_pc.value / 100)
      else least(v_pc.value, v_subtotal)
    end;
  end if;

  -- Livraison (le seuil « offerte dès » porte sur le montant après remise)
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
    if v_offered or (v_free_from is not null and v_subtotal - v_discount >= v_free_from) then
      v_fee := 0;
    end if;
  else
    raise exception 'invalid_delivery';
  end if;

  insert into public.orders (
    customer_name, phone, region, city, address, delivery_method, payment_method,
    items, subtotal, delivery_fee, total, note, promo_code, discount
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
    v_subtotal - v_discount + v_fee,
    nullif(trim(p_customer ->> 'note'), ''),
    case when v_discount > 0 then v_code end,
    v_discount
  )
  returning * into v_order;

  return query select v_order.id, v_order.number, v_order.total;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text, text) to service_role;
