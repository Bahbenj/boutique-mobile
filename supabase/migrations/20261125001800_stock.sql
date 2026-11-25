-- =============================================================================
-- 18 · Stock : seuil d'alerte réglable, historique des mouvements
-- =============================================================================
-- Rejouable.
--   settings.stock          { "low_threshold": 3 } : alerte « stock faible » de l'admin.
--   stock_movements         une ligne par changement de stock, écrite par un
--                           déclencheur (jamais par l'API) : qui, quand, combien,
--                           pourquoi. Lecture réservée à l'admin.
-- Motif déduit du contexte :
--   vente       place_order (requête avec la clé de service) ;
--   annulation  commande annulée (stock rendu par orders_restock_on_cancel) ;
--   reprise     commande annulée puis réactivée (stock repris) ;
--   ajustement  modification dans l'admin (motif libre via admin_set_stock) ;
--   creation    produit créé avec du stock.

insert into public.settings (key, value) values ('stock', '{"low_threshold": 3}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  delta integer not null,
  stock_after integer not null,
  reason text not null check (reason in ('vente', 'annulation', 'reprise', 'ajustement', 'creation')),
  note text check (note is null or char_length(note) <= 200),
  actor text check (actor is null or char_length(actor) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_created_idx on public.stock_movements (created_at desc);
create index if not exists stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

alter table public.stock_movements enable row level security;

drop policy if exists "stock_movements_select_admin" on public.stock_movements;
create policy "stock_movements_select_admin" on public.stock_movements
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.stock_movements from public, anon, authenticated;
grant select on table public.stock_movements to authenticated;
grant all on table public.stock_movements to service_role;

-- --- Déclencheur : journal des mouvements ----------------------------------------------

create or replace function public.log_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_email text := v_claims ->> 'email';
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
    -- Changement fait par un autre déclencheur : annulation / réactivation d'une commande
    v_reason := case when new.stock > old.stock then 'annulation' else 'reprise' end;
    v_actor := coalesce(v_email, 'Système');
  elsif coalesce(v_claims ->> 'role', '') = 'service_role' then
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

revoke all on function public.log_stock_movement() from public, anon, authenticated;

drop trigger if exists products_stock_log on public.products;
create trigger products_stock_log
  after insert or update of stock on public.products
  for each row execute function public.log_stock_movement();

-- --- Ajustement avec motif (admin) -----------------------------------------------------
-- security invoker : la RLS et les droits de l'admin s'appliquent à la mise à jour.

create or replace function public.admin_set_stock(p_product uuid, p_stock integer, p_note text default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
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
