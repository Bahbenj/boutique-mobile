-- =============================================================================
-- 14 · Tableau de bord : commandes et demandes de réparation
-- =============================================================================
-- Rejouable. Remplace admin_dashboard_stats() (migration 7) : même résultat pour
-- les commandes, plus un bloc « repairs » (demandes à traiter par statut et
-- demandes reçues par période). Toujours security invoker (RLS des tables
-- appliquée) et refus explicite pour un non-admin. Périodes à l'heure de Bamako.

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'Africa/Bamako';
  v_day timestamp := date_trunc('day', v_now);
  v_week timestamp := date_trunc('week', v_now);
  v_month timestamp := date_trunc('month', v_now);
  v_orders jsonb;
  v_repairs jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with o as (
    select status, total, created_at at time zone 'Africa/Bamako' as local_at
    from public.orders
    -- commandes du mois + toutes celles encore à traiter (quelle que soit leur date)
    where created_at >= (v_month at time zone 'Africa/Bamako')
       or status in ('nouvelle', 'confirmee', 'expediee')
  )
  select jsonb_build_object(
    'today', jsonb_build_object(
      'orders', count(*) filter (where local_at >= v_day and status <> 'annulee'),
      'revenue', coalesce(sum(total) filter (where local_at >= v_day and status <> 'annulee'), 0)
    ),
    'week', jsonb_build_object(
      'orders', count(*) filter (where local_at >= v_week and status <> 'annulee'),
      'revenue', coalesce(sum(total) filter (where local_at >= v_week and status <> 'annulee'), 0)
    ),
    'month', jsonb_build_object(
      'orders', count(*) filter (where local_at >= v_month and status <> 'annulee'),
      'revenue', coalesce(sum(total) filter (where local_at >= v_month and status <> 'annulee'), 0),
      'collected', coalesce(sum(total) filter (where local_at >= v_month and status = 'livree'), 0),
      'cancelled', count(*) filter (where local_at >= v_month and status = 'annulee')
    ),
    'pending', jsonb_build_object(
      'nouvelle', count(*) filter (where status = 'nouvelle'),
      'confirmee', count(*) filter (where status = 'confirmee'),
      'expediee', count(*) filter (where status = 'expediee')
    )
  )
  into v_orders
  from o;

  with r as (
    select status, created_at at time zone 'Africa/Bamako' as local_at
    from public.repair_requests
    where created_at >= (v_month at time zone 'Africa/Bamako')
       or status in ('nouvelle', 'devis_envoye', 'en_cours', 'prete')
  )
  select jsonb_build_object(
    'pending', jsonb_build_object(
      'nouvelle', count(*) filter (where status = 'nouvelle'),
      'devis_envoye', count(*) filter (where status = 'devis_envoye'),
      'en_cours', count(*) filter (where status = 'en_cours'),
      'prete', count(*) filter (where status = 'prete')
    ),
    'received', jsonb_build_object(
      'today', count(*) filter (where local_at >= v_day),
      'week', count(*) filter (where local_at >= v_week),
      'month', count(*) filter (where local_at >= v_month)
    )
  )
  into v_repairs
  from r;

  return v_orders || jsonb_build_object('repairs', v_repairs, 'generated_at', now());
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;
