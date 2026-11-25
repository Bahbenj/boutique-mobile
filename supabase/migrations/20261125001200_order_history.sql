-- =============================================================================
-- 12 · Historique des statuts de commande (qui et quand)
-- =============================================================================
-- Rejouable. Chaque création de commande et chaque changement de statut est
-- journalisé par un déclencheur, côté base : l'historique ne dépend pas du code
-- de l'admin et ne peut pas être falsifié depuis l'API.
--   changed_by        identifiant de l'admin (auth.uid()), null pour le site
--   changed_by_email  e-mail lu dans le jeton de session, figé au moment du
--                     changement (lisible même si le compte est supprimé)

create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid,
  changed_by_email text check (changed_by_email is null or char_length(changed_by_email) <= 320),
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- --- Journalisation ----------------------------------------------------------------
-- security definer : le déclencheur écrit dans la table alors qu'aucun rôle de
-- l'API n'a le droit d'y insérer.

create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, created_at)
    values (new.id, null, new.status, new.created_at);
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_email)
    values (new.id, old.status, new.status, (select auth.uid()), v_claims ->> 'email');
  end if;
  return null;
end;
$$;

revoke all on function public.log_order_status() from public, anon, authenticated;

drop trigger if exists orders_status_history on public.orders;
create trigger orders_status_history
  after insert or update of status on public.orders
  for each row execute function public.log_order_status();

-- Commandes antérieures : une ligne « création », plus l'état actuel s'il a changé
-- (auteur et date exacts inconnus). Seulement pour les commandes sans historique.
insert into public.order_status_history (order_id, from_status, to_status, created_at)
select o.id, null, 'nouvelle', o.created_at
from public.orders o
where not exists (select 1 from public.order_status_history h where h.order_id = o.id);

insert into public.order_status_history (order_id, from_status, to_status, created_at)
select o.id, 'nouvelle', o.status, o.updated_at
from public.orders o
where o.status <> 'nouvelle'
  and (select count(*) from public.order_status_history h where h.order_id = o.id) = 1;

-- --- Droits : lecture admin uniquement, aucune écriture via l'API ----------------------

alter table public.order_status_history enable row level security;

drop policy if exists "order_status_history_select_admin" on public.order_status_history;
create policy "order_status_history_select_admin" on public.order_status_history
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.order_status_history from anon, authenticated;
grant select on table public.order_status_history to authenticated;
grant all on table public.order_status_history to service_role;
