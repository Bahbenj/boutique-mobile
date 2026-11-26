-- =============================================================================
-- 21 · Journal d'activité (propriétaire)
-- =============================================================================
-- Rejouable. Chaque ajout, modification ou suppression faite depuis l'admin
-- (requête avec le jeton d'un membre de l'équipe) est journalisée par un
-- déclencheur : qui, quand, quoi, et pour une modification les champs changés
-- (avant → après). Les ventes du site (clé de service) et le SQL Editor ne
-- sont pas journalisés ici (ventes : historique du stock et des commandes).
-- Lecture : propriétaire seul. Écriture : déclencheur seul (jamais l'API).

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text check (actor_email is null or char_length(actor_email) <= 320),
  action text not null check (action in ('ajout', 'modification', 'suppression')),
  entity text not null check (char_length(entity) <= 40),
  entity_id text check (entity_id is null or char_length(entity_id) <= 80),
  label text check (label is null or char_length(label) <= 200),
  changes jsonb
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_actor_idx on public.activity_log (actor_email, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_log_select_owner" on public.activity_log;
create policy "activity_log_select_owner" on public.activity_log
  for select to authenticated
  using ((select public.is_owner()));

revoke all on table public.activity_log from public, anon, authenticated;
grant select on table public.activity_log to authenticated;
grant all on table public.activity_log to service_role;

-- --- Déclencheur générique -------------------------------------------------------------
-- tg_argv[0] : type d'objet affiché (« produit », « commande »…) ;
-- tg_argv[1] : colonne qui sert de libellé (name, code, number, key…).
-- Gros champs (photos, variantes, description, réglages) : noté « modifié », sans valeurs.

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb;
  v_label text;
  v_big text[] := array['images', 'variants', 'specs', 'highlights', 'description', 'value', 'items', 'internal_notes'];
begin
  if coalesce(v_claims ->> 'role', '') <> 'authenticated' then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, case when k = any (v_big) then '["…", "…"]'::jsonb else jsonb_build_array(v_old -> k, v_new -> k) end)
      into v_changes
      from jsonb_object_keys(v_new) k
      where k not in ('updated_at', 'created_at', 'position') and (v_old -> k) is distinct from (v_new -> k);
    if v_changes is null then
      return null; -- rien de visible n'a changé (ex. ordre d'affichage)
    end if;
  end if;

  if tg_table_name = 'admins' then
    select u.email into v_label from auth.users u where u.id = (v_row ->> 'user_id')::uuid;
  else
    v_label := v_row ->> tg_argv[1];
  end if;

  insert into public.activity_log (actor_id, actor_email, action, entity, entity_id, label, changes)
  values (
    nullif(v_claims ->> 'sub', '')::uuid,
    v_claims ->> 'email',
    case tg_op when 'INSERT' then 'ajout' when 'UPDATE' then 'modification' else 'suppression' end,
    tg_argv[0],
    left(coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'user_id'), 80),
    left(v_label, 200),
    v_changes
  );
  return null;
end;
$$;

revoke all on function public.log_activity() from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('products', 'produit', 'name'),
      ('categories', 'catégorie', 'name'),
      ('promotions', 'promotion', 'name'),
      ('promo_codes', 'code promo', 'code'),
      ('settings', 'réglage', 'key'),
      ('delivery_zones', 'zone de livraison', 'name'),
      ('reviews', 'avis', 'name'),
      ('orders', 'commande', 'number'),
      ('repair_requests', 'réparation', 'number'),
      ('admins', 'membre de l''équipe', 'user_id')
    ) as v(tbl, entity, label_col)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists %I on public.%I', t.tbl || '_activity', t.tbl);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.log_activity(%L, %L)',
        t.tbl || '_activity', t.tbl, t.entity, t.label_col
      );
    end if;
  end loop;
end
$$;
