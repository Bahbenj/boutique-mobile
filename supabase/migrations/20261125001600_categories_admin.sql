-- =============================================================================
-- 16 · Catégories : masquage, suppression protégée
-- =============================================================================
-- Rejouable.
--   is_active  false = catégorie masquée : absente du menu et de la boutique,
--              ses produits ne sont plus visibles ni commandables.
-- Une catégorie qui contient encore des produits ne peut plus être supprimée
-- (on delete restrict) : il faut d'abord déplacer ses produits, ou la masquer.

alter table public.categories add column if not exists is_active boolean not null default true;

alter table public.products drop constraint if exists products_category_id_fkey;
alter table public.products add constraint products_category_id_fkey
  foreign key (category_id) references public.categories (id) on delete restrict;

-- --- Lecture publique : catégories visibles, produits des catégories visibles --------

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products
  for select to anon, authenticated
  using (
    (is_active and (category_id is null
                    or exists (select 1 from public.categories c where c.id = category_id and c.is_active)))
    or (select public.is_admin())
  );

-- --- Création de commande : refuse les produits d'une catégorie masquée --------------
-- Identique à la migration 15, sauf la recherche du produit.

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
