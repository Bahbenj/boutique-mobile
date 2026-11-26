-- =============================================================================
-- 23 · Comptes clients
-- =============================================================================
-- Rejouable.
--   profiles          un profil par compte (id = auth.users.id), créé par un
--                     déclencheur à l'inscription (e-mail, lien magique ou Google) :
--                     nom, téléphone, adresse de livraison par défaut, date
--                     d'acceptation des CGV. Aucun rôle ni droit dans cette table :
--                     l'accès à l'admin reste décidé par public.admins seule.
--   orders.user_id    compte qui a passé la commande ;
--   repair_requests.user_id  compte rattaché à la demande (facultatif).
--   place_order       exige un client connecté (auth.uid()) dont l'e-mail est
--                     confirmé ; appelée avec la session du client (rôle
--                     authenticated), plus jamais avec la clé de service.
--   RLS               un client lit ses commandes (jamais celles des autres), son
--                     historique de statuts et ses réparations via des fonctions
--                     qui ne montrent ni les e-mails de l'équipe ni les notes
--                     internes ; il ne modifie rien d'autre que son profil.
--   rate_limit_hits   limites anti-robots (connexion, inscription, e-mails),
--                     client = empreinte SHA-256 de l'IP (jamais l'IP).

-- --- Profils ------------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  phone text check (phone is null or phone ~ '^[2-9][0-9]{7}$'),
  zone_id text references public.delivery_zones (id) on delete set null,
  city text not null default '' check (char_length(city) <= 80),
  address text not null default '' check (char_length(address) <= 300),
  cgv_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Ni insertion ni suppression par l'API (déclencheur et suppression du compte seulement) ;
-- modification limitée aux champs du client.
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, phone, zone_id, city, address, cgv_accepted_at) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Création automatique du profil (inscription e-mail : nom et téléphone transmis
-- dans les métadonnées ; Google : nom du compte Google, téléphone demandé ensuite).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  -- « +223 66 11 22 33 », « 0022366112233 » ou « 66112233 » → 8 chiffres
  v_phone text := regexp_replace(regexp_replace(coalesce(v_meta ->> 'phone', ''), '\D', '', 'g'), '^(00)?223(?=[0-9]{8}$)', '');
begin
  insert into public.profiles (id, full_name, phone, cgv_accepted_at)
  values (
    new.id,
    left(trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), 80),
    case when v_phone ~ '^[2-9][0-9]{7}$' then v_phone end,
    case when (v_meta ->> 'cgv_accepted') = 'true' then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes déjà existants (équipe) : un profil vide, sans effet sur leurs droits
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- --- Commandes et réparations rattachées au compte ---------------------------------------

alter table public.orders add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()));
-- Aucune politique de modification pour les clients : statut et montants restent
-- réservés à l'équipe (orders_update_admin, is_staff).

alter table public.repair_requests add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists repair_requests_user_idx on public.repair_requests (user_id, created_at desc);

-- Historique des statuts d'une commande du client (sans l'e-mail de l'équipe)
create or replace function public.my_order_history(p_order uuid)
returns table (to_status public.order_status, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select h.to_status, h.created_at
  from public.order_status_history h
  join public.orders o on o.id = h.order_id
  where h.order_id = p_order and o.user_id = auth.uid() and auth.uid() is not null
  order by h.created_at, h.id;
$$;

-- Réparations du client (sans les notes internes de l'atelier)
create or replace function public.my_repairs()
returns table (id uuid, number text, device text, issue text, status public.repair_status, quote_amount numeric, created_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.number, r.device, r.issue, r.status, r.quote_amount, r.created_at, r.updated_at
  from public.repair_requests r
  where r.user_id = auth.uid() and auth.uid() is not null
  order by r.created_at desc
  limit 100;
$$;

revoke all on function public.my_order_history(uuid), public.my_repairs() from public, anon, authenticated;
grant execute on function public.my_order_history(uuid), public.my_repairs() to authenticated;

-- Demande de réparation : rattachée au compte si le serveur transmet un user_id
-- (session vérifiée côté serveur ; fonction réservée à la clé de service).
create or replace function public.create_repair_request(p_request jsonb)
returns table (request_id uuid, request_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_request ->> 'name', ''));
  v_phone text := coalesce(p_request ->> 'phone', '');
  v_device text := trim(coalesce(p_request ->> 'device', ''));
  v_issue text := trim(coalesce(p_request ->> 'issue', ''));
  v_user uuid;
  v_row public.repair_requests%rowtype;
begin
  if char_length(v_name) not between 2 and 80 then raise exception 'invalid_name'; end if;
  if v_phone !~ '^[2-9][0-9]{7}$' then raise exception 'invalid_phone'; end if;
  if char_length(v_device) not between 2 and 80 then raise exception 'invalid_device'; end if;
  if char_length(v_issue) not between 3 and 1000 then raise exception 'invalid_issue'; end if;
  if coalesce(p_request ->> 'user_id', '') ~ '^[0-9a-f-]{36}$' then
    select id into v_user from auth.users where id = (p_request ->> 'user_id')::uuid;
  end if;

  if (select count(*) from public.repair_requests
      where phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'too_many_requests';
  end if;

  insert into public.repair_requests (customer_name, phone, device, issue, user_id)
  values (v_name, v_phone, v_device, v_issue, v_user)
  returning * into v_row;

  return query select v_row.id, v_row.number;
end;
$$;

revoke all on function public.create_repair_request(jsonb) from public, anon, authenticated;
grant execute on function public.create_repair_request(jsonb) to service_role;

-- --- Journaux : ventes des clients et équipe bien distinguées -----------------------------
-- Historique du stock : une baisse faite par place_order est une vente (app.stock_reason),
-- quel que soit le rôle de la requête (désormais celui du client).

create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_email text := v_claims ->> 'email';
  v_forced text := nullif(current_setting('app.stock_reason', true), '');
  v_reason text;
  v_actor text;
  v_note text := nullif(trim(coalesce(current_setting('app.stock_note', true), '')), '');
begin
  if tg_op = 'INSERT' then
    if new.stock > 0 then
      insert into public.stock_movements (product_id, product_name, delta, stock_after, reason, note, actor)
      values (new.id, new.name, new.stock, new.stock, 'creation', null, coalesce(v_email, 'Système'));
    end if;
    return new;
  end if;

  if new.stock = old.stock then
    return new;
  end if;

  if pg_trigger_depth() > 1 then
    v_reason := case when new.stock > old.stock then 'annulation' else 'reprise' end;
    v_actor := coalesce(v_email, 'Système');
  elsif v_forced = 'vente' or coalesce(v_claims ->> 'role', '') = 'service_role' then
    v_reason := 'vente';
    v_actor := 'Commande en ligne';
  else
    v_reason := 'ajustement';
    v_actor := coalesce(v_email, 'Éditeur SQL Supabase');
  end if;

  insert into public.stock_movements (product_id, product_name, delta, stock_after, reason, note, actor)
  values (new.id, new.name, new.stock - old.stock, new.stock, v_reason, left(v_note, 200), left(v_actor, 200));
  return new;
end;
$$;

-- Journal d'activité : seulement les membres de l'équipe (jamais les clients)
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
  v_label text;
  v_big text[] := array['images', 'variants', 'specs', 'highlights', 'description', 'value', 'items', 'internal_notes'];
begin
  if coalesce(v_claims ->> 'role', '') <> 'authenticated' or not public.is_staff() then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, case when k = any (v_big) then '["…", "…"]'::jsonb else jsonb_build_array(v_old -> k, v_new -> k) end)
      into v_changes
      from jsonb_object_keys(v_new) k
      where k not in ('updated_at', 'created_at', 'position') and (v_old -> k) is distinct from (v_new -> k);
    if v_changes is null then
      return null;
    end if;
  end if;

  if tg_table_name = 'admins' then
    select u.email into v_label from auth.users u where u.id = (v_row ->> 'user_id')::uuid;
  else
    v_label := v_row ->> tg_argv[1];
  end if;

  insert into public.activity_log (actor_id, actor_email, action, entity, entity_id, label, changes)
  values (
    nullif(v_claims ->> 'sub', '')::uuid,
    v_claims ->> 'email',
    case tg_op when 'INSERT' then 'ajout' when 'UPDATE' then 'modification' else 'suppression' end,
    tg_argv[0],
    left(coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'user_id'), 80),
    left(v_label, 200),
    v_changes
  );
  return null;
end;
$$;

-- --- Création de commande : client connecté et confirmé, commande rattachée ---------------
-- Identique à la migration 17, plus : auth.uid() obligatoire, e-mail confirmé,
-- orders.user_id, ventes marquées pour l'historique du stock. Exécutable par
-- authenticated seulement (ni anon, ni la clé de service).

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
  v_user uuid := auth.uid();
begin
  -- Compte client obligatoire, e-mail confirmé (Google : déjà confirmé)
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where u.id = v_user and u.email_confirmed_at is not null) then
    raise exception 'email_not_confirmed';
  end if;

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

  -- Les baisses de stock de cette commande sont des ventes (historique du stock)
  perform set_config('app.stock_reason', 'vente', true);

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
  perform set_config('app.stock_reason', '', true);

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
    items, subtotal, delivery_fee, total, note, promo_code, discount, user_id
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
    v_discount,
    v_user
  )
  returning * into v_order;

  return query select v_order.id, v_order.number, v_order.total;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, text, text) from public, anon, authenticated, service_role;
grant execute on function public.place_order(jsonb, jsonb, text, text) to authenticated;

-- --- Clients (admin) : comptes, hors équipe ----------------------------------------------

create or replace function public.admin_customer_accounts(p_q text default null, p_user uuid default null)
returns table (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  provider text,
  email_confirmed boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  orders_count bigint,
  total_spent numeric,
  last_order_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if length(v_digits) > 8 and v_digits like '223%' then
    v_digits := substr(v_digits, 4);
  end if;
  return query
    select u.id, u.email::text, p.full_name, p.phone,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
           u.email_confirmed_at is not null,
           u.created_at, u.last_sign_in_at,
           count(o.id) filter (where o.status <> 'annulee'),
           coalesce(sum(o.total) filter (where o.status <> 'annulee'), 0),
           max(o.created_at)
    from auth.users u
    join public.profiles p on p.id = u.id
    left join public.orders o on o.user_id = u.id
    where not exists (select 1 from public.admins a where a.user_id = u.id)
      and (p_user is null or u.id = p_user)
      and (v_q is null
           or u.email ilike '%' || v_q || '%'
           or p.full_name ilike '%' || v_q || '%'
           or (length(v_digits) >= 3 and p.phone like '%' || v_digits || '%'))
    group by u.id, p.id
    order by max(o.created_at) desc nulls last, u.created_at desc
    limit 300;
end;
$$;

revoke all on function public.admin_customer_accounts(text, uuid) from public, anon, authenticated;
grant execute on function public.admin_customer_accounts(text, uuid) to authenticated;

-- --- Limites anti-robots (connexion, inscription, e-mails) ---------------------------------
-- Appelées par le serveur Next.js (clé de service) avant chaque tentative.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null check (bucket in ('login', 'signup', 'email')),
  client text not null check (char_length(client) between 8 and 128),
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_idx on public.rate_limit_hits (bucket, client, created_at desc);

alter table public.rate_limit_hits enable row level security;
revoke all on table public.rate_limit_hits from public, anon, authenticated;
grant all on table public.rate_limit_hits to service_role;

-- true = encore permis (moins de p_max essais dans la dernière heure)
create or replace function public.rate_limit_allowed(p_bucket text, p_client text, p_max integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select count(*) from public.rate_limit_hits
          where bucket = p_bucket and client = p_client and created_at > now() - interval '1 hour') < p_max;
$$;

create or replace function public.rate_limit_hit(p_bucket text, p_client text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.rate_limit_hits where created_at < now() - interval '1 day';
  insert into public.rate_limit_hits (bucket, client) values (p_bucket, left(p_client, 128));
end;
$$;

revoke all on function public.rate_limit_allowed(text, text, integer), public.rate_limit_hit(text, text) from public, anon, authenticated;
grant execute on function public.rate_limit_allowed(text, text, integer), public.rate_limit_hit(text, text) to service_role;
