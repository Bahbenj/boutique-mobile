-- =============================================================================
-- 7 · Tableau de bord : statistiques des commandes
-- =============================================================================
-- Calculées en base (une requête au lieu de rapatrier toutes les commandes),
-- à l'heure de Bamako (GMT) pour que « aujourd'hui » corresponde à la journée du magasin.
--
-- security invoker : s'exécute avec les droits de l'appelant, donc soumise à la
-- RLS des commandes ; un non-admin est en plus refusé explicitement.
-- Périodes calendaires : jour, semaine (depuis lundi), mois (depuis le 1er).
-- Chiffre d'affaires = total des commandes non annulées (livraison comprise) ;
-- « encaissé » = commandes livrées (paiement à la livraison).

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
  v_result jsonb;
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
    ),
    'generated_at', now()
  )
  into v_result
  from o;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated, service_role;

-- --- Commandes : droits resserrés à l'usage réel de l'admin -----------------------
-- L'admin ne modifie que le statut (le restockage à l'annulation est fait par
-- le déclencheur) et ne supprime jamais une commande : une suppression
-- fausserait le stock. Montants, articles et coordonnées sont donc
-- non modifiables via l'API, même pour un admin.
revoke update, delete on table public.orders from authenticated;
grant update (status) on table public.orders to authenticated;
