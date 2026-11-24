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

create trigger orders_restock
  after update of status on public.orders
  for each row execute function public.orders_restock_on_cancel();
