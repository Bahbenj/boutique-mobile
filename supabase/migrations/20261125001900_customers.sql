-- =============================================================================
-- 19 · Clients : liste dérivée des commandes et des demandes de réparation
-- =============================================================================
-- Rejouable. Aucune table nouvelle : un client = un numéro de téléphone.
--   admin_customers(p_q, p_sort, p_limit)
--     nom le plus récent, téléphone, nombre de commandes (hors annulées), total
--     dépensé (commandes livrées ou en cours, hors annulées), nombre de demandes
--     de réparation, dernière activité.
-- security invoker : la RLS des commandes et des réparations s'applique, et
-- les non-admins sont refusés explicitement.

create index if not exists orders_phone_created_idx on public.orders (phone, created_at desc);

create or replace function public.admin_customers(p_q text default null, p_sort text default 'recent', p_limit integer default 200)
returns table (
  phone text,
  name text,
  orders_count bigint,
  total_spent numeric,
  repairs_count bigint,
  last_activity timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- « +223 76 12 34 56 », « 00223 76… » ou « 22376123456 » → recherche sans l'indicatif
  if coalesce(p_q, '') ~ '^\s*(\+|00)\s*223' then
    v_digits := regexp_replace(v_digits, '^(00)?223', '');
  elsif length(v_digits) > 8 and v_digits like '223%' then
    v_digits := substr(v_digits, 4);
  end if;

  return query
  with activity as (
    select o.phone, o.customer_name as name, o.created_at, 1 as is_order, 0 as is_repair,
           case when o.status <> 'annulee' then o.total else 0 end as spent,
           case when o.status <> 'annulee' then 1 else 0 end as counted
    from public.orders o
    union all
    select r.phone, r.customer_name, r.created_at, 0, 1, 0, 0
    from public.repair_requests r
  ),
  grouped as (
    select a.phone,
           (array_agg(a.name order by a.created_at desc))[1] as name,
           sum(a.counted)::bigint as orders_count,
           sum(a.spent) as total_spent,
           sum(a.is_repair)::bigint as repairs_count,
           max(a.created_at) as last_activity
    from activity a
    group by a.phone
  )
  select g.phone, g.name, g.orders_count, g.total_spent, g.repairs_count, g.last_activity
  from grouped g
  where v_q is null
     or (length(v_digits) >= 3 and g.phone like '%' || v_digits || '%')
     or g.name ilike '%' || v_q || '%'
  order by
    case when p_sort = 'depenses' then g.total_spent end desc nulls last,
    case when p_sort = 'commandes' then g.orders_count end desc nulls last,
    g.last_activity desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

revoke all on function public.admin_customers(text, text, integer) from public, anon, authenticated;
grant execute on function public.admin_customers(text, text, integer) to authenticated;
