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
