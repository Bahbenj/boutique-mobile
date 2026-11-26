-- =============================================================================
-- 25 · Carnet d'adresses des clients, consignes et position de livraison
-- =============================================================================
-- Rejouable. place_order N'EST PAS modifiée.
--   customer_addresses   adresses enregistrées par le client (10 au plus) :
--                        libellé (Maison, Bureau…), destinataire, téléphone,
--                        zone de livraison existante, quartier / rue / repère,
--                        consignes pour le livreur, position facultative.
--                        Une seule adresse par défaut. RLS : les siennes seulement.
--   orders               nouvelles colonnes facultatives, copiées au moment de
--                        l'achat : delivery_instructions, delivery_lat, delivery_lng.
--                        Nom, téléphone, zone, quartier et adresse sont déjà copiés
--                        dans la commande par place_order : modifier ou supprimer
--                        une adresse du carnet ne change jamais une commande passée.
--   set_order_delivery_details  complète une commande du client, juste après
--                        sa création (15 minutes, une seule fois, sa commande seulement).

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 40),
  recipient_name text not null check (char_length(recipient_name) between 2 and 80),
  phone text not null check (phone ~ '^[2-9][0-9]{7}$'),
  zone_id text not null references public.delivery_zones (id),
  city text not null default '' check (char_length(city) <= 80),
  address text not null check (char_length(address) between 3 and 300),
  instructions text not null default '' check (char_length(instructions) <= 300),
  lat numeric(9, 6) check (lat is null or lat between -90 and 90),
  lng numeric(9, 6) check (lng is null or lng between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_position_check check ((lat is null) = (lng is null))
);

create index if not exists customer_addresses_user_idx on public.customer_addresses (user_id, created_at);
create unique index if not exists customer_addresses_one_default on public.customer_addresses (user_id) where is_default;

create or replace trigger customer_addresses_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- Contrôles : 10 adresses au plus, texte nettoyé, une seule adresse par défaut
create or replace function public.customer_address_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() or auth.uid() is null then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if (select count(*) from public.customer_addresses where user_id = new.user_id) >= 10 then
      raise exception 'too_many_addresses';
    end if;
    -- Première adresse : adresse par défaut
    if not exists (select 1 from public.customer_addresses where user_id = new.user_id) then
      new.is_default := true;
    end if;
  else
    new.user_id := old.user_id;
  end if;
  new.label := left(btrim(regexp_replace(new.label, '<[^>]*>', '', 'g')), 40);
  new.recipient_name := btrim(regexp_replace(new.recipient_name, '<[^>]*>', '', 'g'));
  new.city := btrim(regexp_replace(new.city, '<[^>]*>', '', 'g'));
  new.address := btrim(regexp_replace(new.address, '<[^>]*>', '', 'g'));
  new.instructions := btrim(regexp_replace(new.instructions, '<[^>]*>', '', 'g'));
  if new.is_default then
    update public.customer_addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

-- Adresse par défaut supprimée : la plus récente des autres prend le relais
create or replace function public.customer_address_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.customer_addresses set is_default = true
      where id = (select id from public.customer_addresses where user_id = old.user_id order by created_at desc limit 1);
  end if;
  return null;
end;
$$;

revoke all on function public.customer_address_guard(), public.customer_address_after_delete() from public, anon, authenticated;

drop trigger if exists customer_addresses_guard on public.customer_addresses;
create trigger customer_addresses_guard
  before insert or update on public.customer_addresses
  for each row execute function public.customer_address_guard();

drop trigger if exists customer_addresses_after_delete on public.customer_addresses;
create trigger customer_addresses_after_delete
  after delete on public.customer_addresses
  for each row execute function public.customer_address_after_delete();

alter table public.customer_addresses enable row level security;

drop policy if exists "customer_addresses_own" on public.customer_addresses;
create policy "customer_addresses_own" on public.customer_addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on table public.customer_addresses from public, anon, authenticated;
grant select, delete on table public.customer_addresses to authenticated;
grant insert (label, recipient_name, phone, zone_id, city, address, instructions, lat, lng, is_default) on table public.customer_addresses to authenticated;
grant update (label, recipient_name, phone, zone_id, city, address, instructions, lat, lng, is_default) on table public.customer_addresses to authenticated;
grant all on table public.customer_addresses to service_role;

-- --- Commandes : consignes et position copiées au moment de l'achat -------------------------

alter table public.orders add column if not exists delivery_instructions text check (delivery_instructions is null or char_length(delivery_instructions) <= 300);
alter table public.orders add column if not exists delivery_lat numeric(9, 6) check (delivery_lat is null or delivery_lat between -90 and 90);
alter table public.orders add column if not exists delivery_lng numeric(9, 6) check (delivery_lng is null or delivery_lng between -180 and 180);

create or replace function public.set_order_delivery_details(p_order uuid, p_instructions text, p_lat numeric default null, p_lng numeric default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text := nullif(left(btrim(regexp_replace(coalesce(p_instructions, ''), '<[^>]*>', '', 'g')), 300), '');
  v_ok boolean := p_lat is not null and p_lng is not null and p_lat between -90 and 90 and p_lng between -180 and 180;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  update public.orders
    set delivery_instructions = v_text,
        delivery_lat = case when v_ok then round(p_lat, 6) end,
        delivery_lng = case when v_ok then round(p_lng, 6) end
    where id = p_order
      and user_id = auth.uid()
      and created_at > now() - interval '15 minutes'
      and delivery_instructions is null and delivery_lat is null;
  return found;
end;
$$;

revoke all on function public.set_order_delivery_details(uuid, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.set_order_delivery_details(uuid, text, numeric, numeric) to authenticated;
