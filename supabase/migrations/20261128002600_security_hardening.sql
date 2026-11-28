-- =============================================================================
-- 26 · Renforcement de la sécurité (audit avant la mise en production)
-- =============================================================================
-- Rejouable. Ne change aucune donnée, n'ajoute que des limites.
--   1. Commandes : 5 au plus par heure et par compte. Chaque commande réserve
--      du stock : sans limite, un compte pourrait vider le stock affiché en
--      passant des commandes en rafale (y compris en appelant place_order
--      directement avec sa session, sans passer par le site).
--   2. Photos d'avis : 20 au plus par jour et par client. Le client envoie ses
--      photos directement au stockage (dossier catalog/reviews/<son id>/) :
--      la taille (5 Mo) et le type (images) étaient déjà limités, pas le nombre.

-- --- 1. Commandes en rafale ---------------------------------------------------------

create or replace function public.orders_rate_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    -- Deux commandes simultanées du même compte passent l'une après l'autre
    perform pg_advisory_xact_lock(hashtext('orders_rate:' || new.user_id::text));
    if (select count(*) from public.orders o
        where o.user_id = new.user_id and o.created_at > now() - interval '1 hour') >= 5 then
      raise exception 'too_many_orders';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.orders_rate_guard() from public, anon, authenticated;

drop trigger if exists orders_rate_guard on public.orders;
create trigger orders_rate_guard
  before insert on public.orders
  for each row execute function public.orders_rate_guard();

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);

-- --- 2. Photos d'avis ---------------------------------------------------------------

create or replace function public.review_photo_quota_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and (select count(*) from storage.objects o
          where o.bucket_id = 'catalog'
            and o.name like 'reviews/' || auth.uid()::text || '/%'
            and o.created_at > now() - interval '1 day') < 20;
$$;

revoke all on function public.review_photo_quota_ok() from public, anon;
grant execute on function public.review_photo_quota_ok() to authenticated;

drop policy if exists "catalog_insert_review" on storage.objects;
create policy "catalog_insert_review" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'catalog'
    and name like 'reviews/' || (select auth.uid())::text || '/%'
    and (select public.review_photo_quota_ok())
  );
