-- =============================================================================
-- 4/4 · Stockage des photos et paramètres par défaut
-- =============================================================================

-- --- Bucket « catalog » : photos produits et catégories -------------------------
-- Public en lecture (URL directes), écriture réservée aux admins.
-- Les photos sont compressées dans le navigateur avant envoi (≤ 5 Mo ici en garde-fou).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "catalog_insert_admin" on storage.objects;
create policy "catalog_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and (select public.is_admin()));

drop policy if exists "catalog_update_admin" on storage.objects;
create policy "catalog_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()))
  with check (bucket_id = 'catalog' and (select public.is_admin()));

drop policy if exists "catalog_delete_admin" on storage.objects;
create policy "catalog_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));

-- --- Paramètres par défaut (modifiables ensuite depuis /admin/parametres) -------
-- Valeurs reprises de config/site.ts. « on conflict do nothing » : relancer la
-- migration n'écrase jamais ce que le commerçant a saisi.

insert into public.settings (key, value) values
(
  'store',
  '{
    "name": "Boutique Mobile",
    "whatsapp": "21600000000",
    "phone": "+216 00 000 000",
    "email": "contact@example.tn",
    "address": { "street": "Avenue Habib Bourguiba", "city": "Tunis", "governorate": "Tunis", "postal_code": "1000" },
    "hours": [
      { "days": "Lundi – Samedi", "time": "09:00 – 20:00" },
      { "days": "Dimanche", "time": "10:00 – 14:00" }
    ]
  }'::jsonb
),
(
  'delivery',
  '{
    "free_from": 300,
    "options": [
      { "id": "home", "label": "Livraison à domicile", "price": 8, "delay": "24 – 72 h" },
      { "id": "express", "label": "Express (Grand Tunis)", "price": 12, "delay": "Le jour même" },
      { "id": "pickup", "label": "Retrait en magasin", "price": 0, "delay": "Sous 2 h" }
    ],
    "governorate_fees": {}
  }'::jsonb
),
(
  'announcement',
  '{ "enabled": false, "text": "", "link": "" }'::jsonb
)
on conflict (key) do nothing;
