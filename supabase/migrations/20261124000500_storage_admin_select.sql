-- =============================================================================
-- 5 · Stockage : lecture des fichiers par les admins
-- =============================================================================
-- Supprimer ou remplacer une photo dans Storage exige aussi le droit de
-- lecture (SELECT) sur storage.objects. Le bucket reste public pour l'affichage
-- des photos sur le site ; cette politique ne sert qu'à l'administration.

drop policy if exists "catalog_select_admin" on storage.objects;
create policy "catalog_select_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'catalog' and (select public.is_admin()));
