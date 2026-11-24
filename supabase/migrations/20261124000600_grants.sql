-- =============================================================================
-- 6 · Droits d'accès explicites (GRANT) pour l'API Supabase
-- =============================================================================
-- Les projets Supabase récents n'accordent plus automatiquement de droits sur
-- les tables créées en SQL : sans GRANT, Postgres refuse l'accès (« permission
-- denied for table … ») AVANT même d'évaluer la Row Level Security.
--
-- Deux verrous successifs :
--   1. GRANT : quelles opérations un rôle peut tenter sur une table ;
--   2. RLS   : quelles lignes il peut réellement lire ou modifier.
-- On accorde ici le strict nécessaire aux politiques de la migration 2 :
--
--   table       anon      authenticated (filtré par RLS)          service_role
--   categories  select    select, insert, update, delete (admin)  tout
--   products    select    select, insert, update, delete (admin)  tout
--   settings    select    select, insert, update, delete (admin)  tout
--   orders      —         select, update, delete (admin)          tout
--   admins      —         select (sa propre ligne)                tout
--
-- Les commandes ne sont jamais insérées directement : place_order() (security
-- definer, exécutable par service_role seulement) s'en charge.
-- Rejouable : on retire d'abord tout droit, puis on accorde.

grant usage on schema public to anon, authenticated, service_role;

-- --- Remise à zéro (retire aussi TRUNCATE, REFERENCES, TRIGGER accordés par
--     l'ancien comportement « grant all » des projets plus anciens) ---------------
revoke all on table public.categories, public.products, public.settings, public.orders, public.admins
  from anon, authenticated;

-- --- Catalogue et réglages : lecture publique, écriture admin (RLS) ----------------
grant select on table public.categories, public.products, public.settings to anon;
grant select, insert, update, delete on table public.categories, public.products, public.settings to authenticated;

-- --- Commandes : aucun accès public ; l'admin lit, change le statut, supprime -------
grant select, update, delete on table public.orders to authenticated;

-- --- Admins : chacun ne peut que vérifier sa propre ligne (RLS) ---------------------
grant select on table public.admins to authenticated;

-- --- service_role (serveur uniquement) : accès complet ------------------------------
grant all on table public.categories, public.products, public.settings, public.orders, public.admins to service_role;
grant usage, select on sequence public.order_number_seq to service_role;

-- --- Fonctions -------------------------------------------------------------------------
-- is_admin() : appelée par les politiques RLS et par le site (rpc) ;
-- s'exécute avec les droits de son propriétaire (security definer).
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- place_order() : serveur uniquement.
revoke all on function public.place_order(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.place_order(jsonb, jsonb, text) to service_role;

-- Fonctions de déclencheurs : jamais appelées directement.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.orders_restock_on_cancel() from public, anon, authenticated;
