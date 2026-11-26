-- =============================================================================
-- 22 · Codes promo : limite d'essais (anti-devinette)
-- =============================================================================
-- Rejouable. Comme pour les demandes de réparation (3 par heure et par numéro),
-- la vérification d'un code est limitée : 10 essais ratés par heure et par
-- client. Seuls les échecs comptent (code inconnu, expiré, épuisé) : un client
-- qui retape un bon code n'est jamais bloqué.
--   client = empreinte SHA-256 de l'adresse IP, calculée par le serveur Next.js
--   (l'adresse elle-même n'est jamais enregistrée). Lignes de plus d'un jour
--   effacées au fil des vérifications.
-- Le serveur appelle aussi check_promo_code avant place_order : deviner un code
-- en passant commande est soumis à la même limite.

create table if not exists public.promo_code_attempts (
  id bigint generated always as identity primary key,
  client text not null check (char_length(client) between 8 and 128),
  created_at timestamptz not null default now()
);

create index if not exists promo_code_attempts_client_idx on public.promo_code_attempts (client, created_at desc);

alter table public.promo_code_attempts enable row level security;
revoke all on table public.promo_code_attempts from public, anon, authenticated;
grant all on table public.promo_code_attempts to service_role;

-- Ancienne signature (migration 17) remplacée par la version avec client
drop function if exists public.check_promo_code(text);

create or replace function public.check_promo_code(p_code text, p_client text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_client text := nullif(trim(coalesce(p_client, '')), '');
  v_pc public.promo_codes%rowtype;
  v_reason text;
begin
  if v_client is not null then
    delete from public.promo_code_attempts where created_at < now() - interval '1 day';
    if (select count(*) from public.promo_code_attempts
        where client = v_client and created_at > now() - interval '1 hour') >= 10 then
      return jsonb_build_object('ok', false, 'reason', 'too_many_attempts');
    end if;
  end if;

  select * into v_pc from public.promo_codes where code = v_code;
  if not found or not v_pc.is_active or (v_pc.starts_at is not null and v_pc.starts_at > now()) then
    v_reason := 'invalid';
  elsif v_pc.expires_at is not null and v_pc.expires_at <= now() then
    v_reason := 'expired';
  elsif v_pc.max_uses is not null
     and (select count(*) from public.orders o where o.promo_code = v_code and o.status <> 'annulee') >= v_pc.max_uses then
    v_reason := 'used_up';
  end if;

  if v_reason is not null then
    if v_client is not null then
      insert into public.promo_code_attempts (client) values (left(v_client, 128));
    end if;
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;
  return jsonb_build_object('ok', true, 'code', v_pc.code, 'kind', v_pc.kind, 'value', v_pc.value, 'min_order', v_pc.min_order);
end;
$$;

revoke all on function public.check_promo_code(text, text) from public, anon, authenticated;
grant execute on function public.check_promo_code(text, text) to service_role;
