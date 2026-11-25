-- =============================================================================
-- 13 · Demandes de réparation (formulaire de devis de /reparation)
-- =============================================================================
-- Rejouable. Comme les commandes :
--   • aucune lecture ni écriture publique directe ; le site enregistre une
--     demande par le serveur Next.js (clé service_role), via
--     create_repair_request() qui revalide tout et limite les abus ;
--   • l'admin lit les demandes et ne modifie que le suivi (statut, prix du
--     devis, notes internes) : jamais les coordonnées saisies par le client.

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'repair_status') then
    create type public.repair_status as enum ('nouvelle', 'devis_envoye', 'en_cours', 'prete', 'recuperee', 'annulee');
  end if;
end
$$;

create sequence if not exists public.repair_number_seq start with 1001;

create table if not exists public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('REP-' || nextval('public.repair_number_seq')),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  phone text not null check (phone ~ '^[2-9][0-9]{7}$'), -- 8 chiffres maliens, sans l'indicatif +223
  device text not null check (char_length(device) between 2 and 80), -- modèle du téléphone
  issue text not null check (char_length(issue) between 3 and 1000), -- panne décrite par le client
  status public.repair_status not null default 'nouvelle',
  quote_amount numeric(12, 0) check (quote_amount is null or quote_amount between 0 and 10000000), -- FCFA
  internal_notes text not null default '' check (char_length(internal_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repair_requests_created_idx on public.repair_requests (created_at desc);
create index if not exists repair_requests_status_created_idx on public.repair_requests (status, created_at desc);
create index if not exists repair_requests_phone_created_idx on public.repair_requests (phone, created_at desc);

create or replace trigger repair_requests_updated_at
  before update on public.repair_requests
  for each row execute function public.set_updated_at();

-- --- Création (serveur uniquement) ---------------------------------------------------
-- p_request : { name, phone (8 chiffres), device, issue }
-- Erreurs : invalid_name, invalid_phone, invalid_device, invalid_issue,
-- too_many_requests (plus de 3 demandes en une heure pour ce numéro).

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
  v_row public.repair_requests%rowtype;
begin
  if char_length(v_name) not between 2 and 80 then raise exception 'invalid_name'; end if;
  if v_phone !~ '^[2-9][0-9]{7}$' then raise exception 'invalid_phone'; end if;
  if char_length(v_device) not between 2 and 80 then raise exception 'invalid_device'; end if;
  if char_length(v_issue) not between 3 and 1000 then raise exception 'invalid_issue'; end if;

  -- Anti-abus : un même numéro ne peut pas inonder la liste de l'atelier
  if (select count(*) from public.repair_requests
      where phone = v_phone and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'too_many_requests';
  end if;

  insert into public.repair_requests (customer_name, phone, device, issue)
  values (v_name, v_phone, v_device, v_issue)
  returning * into v_row;

  return query select v_row.id, v_row.number;
end;
$$;

revoke all on function public.create_repair_request(jsonb) from public, anon, authenticated;
grant execute on function public.create_repair_request(jsonb) to service_role;

-- --- Sécurité -----------------------------------------------------------------------------

alter table public.repair_requests enable row level security;

drop policy if exists "repair_requests_select_admin" on public.repair_requests;
create policy "repair_requests_select_admin" on public.repair_requests
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "repair_requests_update_admin" on public.repair_requests;
create policy "repair_requests_update_admin" on public.repair_requests
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- GRANT au strict nécessaire : lecture et suivi (3 colonnes) pour l'admin,
-- rien pour les visiteurs, pas de suppression (une demande s'annule).
revoke all on table public.repair_requests from anon, authenticated;
grant select on table public.repair_requests to authenticated;
grant update (status, quote_amount, internal_notes) on table public.repair_requests to authenticated;
grant all on table public.repair_requests to service_role;

revoke all on sequence public.repair_number_seq from anon, authenticated;
grant usage, select on sequence public.repair_number_seq to service_role;
