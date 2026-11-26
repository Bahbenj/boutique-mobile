-- =============================================================================
-- 24 · Avis produits des clients (note, recommandation, photos, modération)
-- =============================================================================
-- Rejouable. Distinct de public.reviews (témoignages saisis par l'admin, inchangés).
--   product_reviews   un avis par client et par produit ; « En attente » à la
--                     création et après chaque modification ; public seulement
--                     une fois publié par l'équipe (propriétaire ou gérant).
--   Achat vérifié     calculé par la base : une commande LIVRÉE du client contient
--                     le produit. L'avis reste possible sans achat (badge absent).
--   Sécurité          le client n'écrit que note, titre, texte, recommandation et
--                     photos (GRANT par colonne) ; statut, réponse et modération
--                     passent par admin_moderate_product_review (is_admin). Texte
--                     nettoyé (aucune balise HTML), 5 nouveaux avis par heure et par
--                     client, photos limitées au dossier du client (3 au plus).
--   Signalement       par les visiteurs (clé de service, empreinte de l'IP) ;
--                     3 signalements différents → l'avis repasse « En attente ».
-- Colonnes lisibles par le public : jamais user_id, motif de refus ni signalements.

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 80),
  body text not null check (char_length(body) between 10 and 600),
  recommends boolean not null default true,
  photos text[] not null default '{}' check (cardinality(photos) <= 3),
  author_name text not null default '' check (char_length(author_name) <= 60),
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'hidden')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  reply text check (reply is null or char_length(reply) <= 600),
  replied_at timestamptz,
  moderated_by text,
  moderated_at timestamptz,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_idx on public.product_reviews (product_id, status, created_at desc);
create index if not exists product_reviews_status_idx on public.product_reviews (status, created_at desc);
create index if not exists product_reviews_user_idx on public.product_reviews (user_id, created_at desc);

create or replace trigger product_reviews_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

-- --- Contrôles à l'écriture (client) ------------------------------------------------------

create or replace function public.product_review_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_photo text;
  v_prefix text;
begin
  -- Seule la modération (fonction admin) peut changer statut, réponse ou motif
  if coalesce(current_setting('app.review_moderation', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      if new.user_id is distinct from auth.uid() or auth.uid() is null then
        raise exception 'forbidden' using errcode = '42501';
      end if;
      if (select count(*) from public.product_reviews r
          where r.user_id = new.user_id and r.created_at > now() - interval '1 hour') >= 5 then
        raise exception 'too_many_reviews';
      end if;
      new.status := 'pending';
      new.reject_reason := null;
      new.reply := null;
      new.replied_at := null;
      new.moderated_by := null;
      new.moderated_at := null;
      new.report_count := 0;
    else
      new.user_id := old.user_id;
      new.product_id := old.product_id;
      new.reply := old.reply;
      new.replied_at := old.replied_at;
      new.moderated_by := old.moderated_by;
      new.moderated_at := old.moderated_at;
      new.report_count := old.report_count;
      -- Contenu modifié par le client : nouvelle relecture
      if (new.rating, new.title, new.body, new.recommends, new.photos)
         is distinct from (old.rating, old.title, old.body, old.recommends, old.photos) then
        new.status := 'pending';
        new.reject_reason := null;
      else
        new.status := old.status;
        new.reject_reason := old.reject_reason;
      end if;
    end if;

    -- Texte nettoyé : aucune balise HTML, espaces superflus retirés
    new.title := left(btrim(regexp_replace(regexp_replace(coalesce(new.title, ''), '<[^>]*>', '', 'g'), '\s+', ' ', 'g')), 80);
    new.body := btrim(regexp_replace(regexp_replace(new.body, '<[^>]*>', '', 'g'), '[ \t]+', ' ', 'g'));
    if char_length(new.body) < 10 then
      raise exception 'review_too_short';
    end if;

    -- Photos : uniquement des fichiers envoyés par ce client dans son dossier
    v_prefix := '/storage/v1/object/public/catalog/reviews/' || new.user_id::text || '/';
    foreach v_photo in array coalesce(new.photos, '{}') loop
      if position(v_prefix in v_photo) = 0 or v_photo !~ '^https://' then
        raise exception 'invalid_photo';
      end if;
    end loop;
  end if;

  -- Nom affiché : prénom + initiale du nom (jamais l'e-mail)
  select p.full_name into v_name from public.profiles p where p.id = new.user_id;
  v_name := btrim(coalesce(v_name, ''));
  new.author_name := case
    when v_name = '' then 'Client'
    when position(' ' in v_name) > 0 then split_part(v_name, ' ', 1) || ' ' || left(split_part(v_name, ' ', 2), 1) || '.'
    else v_name
  end;
  new.author_name := left(new.author_name, 60);

  -- Achat vérifié : commande livrée de ce client contenant ce produit
  new.verified_purchase := exists (
    select 1 from public.orders o
    where o.user_id = new.user_id and o.status = 'livree'
      and o.items @> jsonb_build_array(jsonb_build_object('product_id', new.product_id::text))
  );
  return new;
end;
$$;

revoke all on function public.product_review_guard() from public, anon, authenticated;

drop trigger if exists product_reviews_guard on public.product_reviews;
create trigger product_reviews_guard
  before insert or update on public.product_reviews
  for each row execute function public.product_review_guard();

-- --- RLS et droits ---------------------------------------------------------------------------

alter table public.product_reviews enable row level security;

drop policy if exists "product_reviews_select" on public.product_reviews;
create policy "product_reviews_select" on public.product_reviews
  for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "product_reviews_insert_own" on public.product_reviews;
create policy "product_reviews_insert_own" on public.product_reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "product_reviews_update_own" on public.product_reviews;
create policy "product_reviews_update_own" on public.product_reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "product_reviews_delete_own" on public.product_reviews;
create policy "product_reviews_delete_own" on public.product_reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on table public.product_reviews from public, anon, authenticated;
grant select (id, product_id, rating, title, body, recommends, photos, author_name, verified_purchase, status, reply, replied_at, created_at, updated_at)
  on table public.product_reviews to anon, authenticated;
grant insert (product_id, rating, title, body, recommends, photos) on table public.product_reviews to authenticated;
grant update (rating, title, body, recommends, photos) on table public.product_reviews to authenticated;
grant delete on table public.product_reviews to authenticated;
grant all on table public.product_reviews to service_role;

-- --- Lectures publiques ----------------------------------------------------------------------

-- Note moyenne, nombre d'avis et % de recommandation par produit (avis publiés seulement)
create or replace function public.product_rating_stats()
returns table (product_id uuid, reviews integer, average numeric, recommend_pct integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.product_id, count(*)::integer, round(avg(r.rating), 1),
         round(100.0 * count(*) filter (where r.recommends) / count(*))::integer
  from public.product_reviews r
  where r.status = 'published'
  group by r.product_id;
$$;

revoke all on function public.product_rating_stats() from public;
grant execute on function public.product_rating_stats() to anon, authenticated, service_role;

-- --- Espace client -----------------------------------------------------------------------------

create or replace function public.my_product_reviews()
returns table (
  id uuid, product_id uuid, product_name text, product_slug text, rating smallint, title text, body text,
  recommends boolean, photos text[], verified_purchase boolean, status text, reject_reason text,
  reply text, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.product_id, p.name, p.slug, r.rating, r.title, r.body, r.recommends, r.photos,
         r.verified_purchase, r.status, r.reject_reason, r.reply, r.created_at, r.updated_at
  from public.product_reviews r
  join public.products p on p.id = r.product_id
  where r.user_id = auth.uid() and auth.uid() is not null
  order by r.updated_at desc;
$$;

-- Produits reçus (commandes livrées) que le client n'a pas encore notés
create or replace function public.my_reviewable_products()
returns table (product_id uuid, name text, slug text, image text, delivered_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.slug, p.images[1], max(o.updated_at)
  from public.orders o
  cross join lateral jsonb_array_elements(o.items) l
  join public.products p on p.id = (l ->> 'product_id')::uuid
  where o.user_id = auth.uid() and auth.uid() is not null and o.status = 'livree'
    and not exists (select 1 from public.product_reviews r where r.user_id = auth.uid() and r.product_id = p.id)
  group by p.id
  order by max(o.updated_at) desc
  limit 20;
$$;

revoke all on function public.my_product_reviews(), public.my_reviewable_products() from public, anon, authenticated;
grant execute on function public.my_product_reviews(), public.my_reviewable_products() to authenticated;

-- --- Modération (propriétaire et gérant) ----------------------------------------------------

create or replace function public.admin_product_reviews(p_status text default null)
returns table (
  id uuid, product_id uuid, product_name text, product_slug text, user_email text, author_name text,
  rating smallint, title text, body text, recommends boolean, photos text[], verified_purchase boolean,
  status text, reject_reason text, reply text, replied_at timestamptz, moderated_by text, moderated_at timestamptz,
  report_count integer, created_at timestamptz, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select r.id, r.product_id, p.name, p.slug, u.email::text, r.author_name, r.rating, r.title, r.body,
           r.recommends, r.photos, r.verified_purchase, r.status, r.reject_reason, r.reply, r.replied_at,
           r.moderated_by, r.moderated_at, r.report_count, r.created_at, r.updated_at
    from public.product_reviews r
    join public.products p on p.id = r.product_id
    left join auth.users u on u.id = r.user_id
    where p_status is null or r.status = p_status
    order by (r.status = 'pending') desc, r.report_count desc, r.updated_at desc
    limit 300;
end;
$$;

-- p_action : publish | reject (motif obligatoire) | hide | reply (texte vide = retirer la réponse)
create or replace function public.admin_moderate_product_review(p_id uuid, p_action text, p_text text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_by text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';
  v_text text := nullif(btrim(regexp_replace(coalesce(p_text, ''), '<[^>]*>', '', 'g')), '');
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform set_config('app.review_moderation', 'on', true);
  if p_action = 'publish' then
    update public.product_reviews set status = 'published', reject_reason = null, report_count = 0, moderated_by = v_by, moderated_at = now() where id = p_id;
  elsif p_action = 'reject' then
    if v_text is null then raise exception 'reason_required'; end if;
    update public.product_reviews set status = 'rejected', reject_reason = left(v_text, 300), moderated_by = v_by, moderated_at = now() where id = p_id;
  elsif p_action = 'hide' then
    update public.product_reviews set status = 'hidden', moderated_by = v_by, moderated_at = now() where id = p_id;
  elsif p_action = 'reply' then
    update public.product_reviews set reply = left(v_text, 600), replied_at = case when v_text is null then null else now() end where id = p_id;
  else
    raise exception 'invalid_action';
  end if;
  if not found then
    perform set_config('app.review_moderation', '', true);
    raise exception 'not_found';
  end if;
  perform set_config('app.review_moderation', '', true);
end;
$$;

create or replace function public.admin_pending_reviews_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (select count(*) from public.product_reviews where status = 'pending');
end;
$$;

revoke all on function public.admin_product_reviews(text), public.admin_moderate_product_review(uuid, text, text), public.admin_pending_reviews_count()
  from public, anon, authenticated;
grant execute on function public.admin_product_reviews(text), public.admin_moderate_product_review(uuid, text, text), public.admin_pending_reviews_count()
  to authenticated;

-- --- Signalement d'un avis abusif (visiteurs, via le serveur) ---------------------------------

create table if not exists public.product_review_reports (
  review_id uuid not null references public.product_reviews (id) on delete cascade,
  client text not null check (char_length(client) between 8 and 128),
  created_at timestamptz not null default now(),
  primary key (review_id, client)
);

alter table public.product_review_reports enable row level security;
revoke all on table public.product_review_reports from public, anon, authenticated;
grant all on table public.product_review_reports to service_role;

-- true = signalement enregistré (une fois par visiteur et par avis)
create or replace function public.report_product_review(p_id uuid, p_client text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not exists (select 1 from public.product_reviews where id = p_id and status = 'published') then
    return false;
  end if;
  insert into public.product_review_reports (review_id, client) values (p_id, left(p_client, 128)) on conflict do nothing;
  if not found then
    return false;
  end if;
  perform set_config('app.review_moderation', 'on', true);
  update public.product_reviews set report_count = report_count + 1 where id = p_id returning report_count into v_count;
  if v_count >= 3 then
    update public.product_reviews set status = 'pending' where id = p_id;
  end if;
  perform set_config('app.review_moderation', '', true);
  return true;
end;
$$;

revoke all on function public.report_product_review(uuid, text) from public, anon, authenticated;
grant execute on function public.report_product_review(uuid, text) to service_role;

-- Limites anti-robots : nouveau compteur « signalement »
alter table public.rate_limit_hits drop constraint if exists rate_limit_hits_bucket_check;
alter table public.rate_limit_hits add constraint rate_limit_hits_bucket_check check (bucket in ('login', 'signup', 'email', 'report'));

-- --- Photos des avis : chaque client dans son dossier catalog/reviews/<id>/ -------------------

drop policy if exists "catalog_insert_review" on storage.objects;
create policy "catalog_insert_review" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and name like 'reviews/' || (select auth.uid())::text || '/%');

drop policy if exists "catalog_delete_review" on storage.objects;
create policy "catalog_delete_review" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and name like 'reviews/' || (select auth.uid())::text || '/%');

drop policy if exists "catalog_select_review" on storage.objects;
create policy "catalog_select_review" on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog' and name like 'reviews/' || (select auth.uid())::text || '/%');

-- --- Journal d'activité : modération par l'équipe ---------------------------------------------
drop trigger if exists product_reviews_activity on public.product_reviews;
create trigger product_reviews_activity
  after insert or update or delete on public.product_reviews
  for each row execute function public.log_activity('avis produit', 'title');
