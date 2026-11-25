-- =============================================================================
-- 9 · Personnalisation Mobile Empire : avis clients, paiement, infos magasin
-- =============================================================================
-- Rejouable. Ne remplace jamais une saisie du commerçant : les paramètres ne
-- sont modifiés que s'ils contiennent encore les valeurs d'exemple.

-- --- 1. Avis clients ------------------------------------------------------------
-- Gérés dans /admin/avis. Seuls les avis publiés sont visibles sur le site.
-- La table démarre VIDE : la section « Avis » de l'accueil reste masquée tant
-- que le commerçant n'a pas saisi de vrais avis (aucun faux avis en ligne).

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  city text not null default '' check (char_length(city) <= 60),
  rating smallint not null default 5 check (rating between 1 and 5),
  text text not null check (char_length(text) between 1 and 600),
  product text check (product is null or char_length(product) <= 80),
  is_published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_published_position_idx on public.reviews (is_published, position, created_at desc);

create or replace trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public" on public.reviews
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "reviews_insert_admin" on public.reviews;
create policy "reviews_insert_admin" on public.reviews
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin" on public.reviews
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin" on public.reviews
  for delete to authenticated
  using ((select public.is_admin()));

-- Droits au strict nécessaire (cf. migration 6) : lecture publique (filtrée par
-- la RLS), gestion complète par l'admin.
revoke all on table public.reviews from anon, authenticated;
grant select on table public.reviews to anon;
grant select, insert, update, delete on table public.reviews to authenticated;
grant all on table public.reviews to service_role;

-- --- 2. Paiement : à la livraison uniquement pour l'instant -----------------------
-- Les autres modes restent configurés mais désactivés ; ils se réactivent dans
-- /admin/parametres. Uniquement si les modes sont encore ceux de l'exemple
-- (migration 8) : un réglage du commerçant n'est jamais touché.

update public.settings
  set value = jsonb_set(
    value,
    '{methods}',
    (select jsonb_agg(case when m ->> 'id' = 'cod' then m else jsonb_set(m, '{enabled}', 'false'::jsonb) end order by ord)
       from jsonb_array_elements(value -> 'methods') with ordinality as e(m, ord))
  )
  where key = 'payment'
    and value = '{
  "methods": [
    { "id": "cod", "label": "Paiement à la livraison", "account": "", "instructions": "Vous payez en espèces au livreur, après avoir vérifié le colis.", "enabled": true },
    { "id": "orange_money", "label": "Orange Money", "account": "+223 70 00 00 00", "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", "enabled": true },
    { "id": "moov_money", "label": "Moov Money", "account": "+223 60 00 00 00", "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", "enabled": true },
    { "id": "wave", "label": "Wave", "account": "+223 70 00 00 00", "instructions": "Nous vous envoyons le lien ou le numéro Wave par WhatsApp après confirmation.", "enabled": true },
    { "id": "sama_money", "label": "Sama Money", "account": "+223 70 00 00 00", "instructions": "Nous vous envoyons le numéro et le montant exact par WhatsApp après confirmation.", "enabled": true },
    { "id": "virement", "label": "Virement bancaire", "account": "", "instructions": "Nous vous envoyons nos coordonnées bancaires par WhatsApp après confirmation.", "enabled": true }
  ]
}'::jsonb;

-- --- 3. Magasin : coordonnées Mobile Empire ----------------------------------------
-- Champ par champ, seulement si la valeur est encore celle de l'exemple.
-- TODO client : confirmer le numéro WhatsApp (repris du premier numéro).

update public.settings
  set value = value
    || case when coalesce(value ->> 'name', 'Boutique Mobile') = 'Boutique Mobile' then '{ "name": "Mobile Empire" }'::jsonb else '{}'::jsonb end
    || case when value ->> 'whatsapp' in ('22370000000', '21600000000') then '{ "whatsapp": "22363515582" }'::jsonb else '{}'::jsonb end
    || case when value ->> 'phone' in ('+223 70 00 00 00', '+216 00 000 000') then '{ "phone": "+223 63 51 55 82" }'::jsonb else '{}'::jsonb end
    || case when value ? 'phones' then '{}'::jsonb else '{ "phones": ["+223 63 51 55 82", "+223 74 05 86 18"] }'::jsonb end
    || case when value ->> 'email' in ('contact@example.com', 'contact@example.tn') then '{ "email": "diarraousmane719@gmail.com" }'::jsonb else '{}'::jsonb end
    || case when value -> 'address' ->> 'street' in ('Rue 311, ACI 2000', 'Avenue Habib Bourguiba')
         then jsonb_build_object('address', jsonb_build_object('street', '', 'district', 'N''Tabacoro', 'city', 'Bamako')) else '{}'::jsonb end
    || case when value -> 'hours' in (
              '[{ "days": "Lundi – Samedi", "time": "08:30 – 20:00" }, { "days": "Dimanche", "time": "10:00 – 14:00" }]'::jsonb,
              '[{ "days": "Lundi – Samedi", "time": "09:00 – 20:00" }, { "days": "Dimanche", "time": "10:00 – 14:00" }]'::jsonb)
         then '{ "hours": [{ "days": "Tous les jours", "time": "8h – 21h" }] }'::jsonb else '{}'::jsonb end
    || case when value ? 'slogan' then '{}'::jsonb else '{ "slogan": "Vendre avec passion, servir avec excellence.", "since": 2018 }'::jsonb end
    || case when value ? 'social' then '{}'::jsonb
         else '{ "social": { "facebook": "https://www.facebook.com/share/14yBZGGk9Mi/?mibextid=wwXIfr", "tiktok": "https://www.tiktok.com/@mobile__empire" } }'::jsonb end
  where key = 'store';
