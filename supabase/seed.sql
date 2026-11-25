-- Généré par scripts/generate-seed.ts depuis data/products.ts : ne pas modifier à la main.
-- Produits et catégories d'exemple (photos Unsplash de remplacement).

insert into public.categories (name, slug, description, image, position) values
  ('Smartphones', 'smartphones', 'Samsung, Tecno et autres marques.', '/photos/provisoire/smartphones.svg', 0),
  ('Écouteurs et casques', 'ecouteurs-casques', 'Écouteurs sans fil et casques Bluetooth.', '/photos/provisoire/ecouteurs-casques.svg', 1),
  ('Montres connectées', 'montres', 'Montres connectées pour tous les jours.', '/photos/provisoire/montres.svg', 2),
  ('Chargeurs et câbles', 'accessoires', 'Chargeurs, chargeurs sans fil et câbles.', '/photos/provisoire/accessoires.svg', 3),
  ('Coques et protections', 'protections', 'Coques et protections d''écran.', '/photos/provisoire/protections.svg', 4),
  ('Gadgets', 'gadgets', 'Loupes d''écran et petits accessoires malins.', '/photos/provisoire/gadgets.svg', 5)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Smartphone Samsung Galaxy', 'smartphone-samsung', 'Smartphone Samsung neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.', (select id from public.categories where slug = 'smartphones'), 'Samsung', 100000, null, 5, 'neuf', null, null, false, true, true, array['/photos/provisoire/smartphones.svg']::text[], '{}'::jsonb, array['Modèle et capacité à préciser']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Smartphone Tecno', 'smartphone-tecno', 'Smartphone Tecno neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.', (select id from public.categories where slug = 'smartphones'), 'Tecno', 80000, null, 5, 'neuf', null, null, false, true, true, array['/photos/provisoire/smartphones.svg']::text[], '{}'::jsonb, array['Modèle et capacité à préciser']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Casque Bluetooth JBL', 'casque-bluetooth-jbl', 'Casque Bluetooth JBL en promotion, livraison offerte.', (select id from public.categories where slug = 'ecouteurs-casques'), 'JBL', 10000, null, 10, 'neuf', null, null, false, true, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, array['Bluetooth', 'Livraison offerte']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Écouteurs JBL Tour Pro 2', 'ecouteurs-jbl-tour-pro-2', 'Écouteurs JBL Tour Pro 2.', (select id from public.categories where slug = 'ecouteurs-casques'), 'JBL', 15000, null, 10, 'neuf', null, null, false, true, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Casque ANC EP07', 'casque-anc-ep07', 'Casque à réduction de bruit active : coupez-vous du bruit et profitez de votre musique.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 20000, null, 10, 'neuf', null, null, false, true, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, array['Réduction de bruit 35 dB', 'Bluetooth 5.3', 'Jusqu''à 60 h d''autonomie']::text[], '[["Connexion","Bluetooth 5.3"],["Réduction de bruit","Active (ANC), jusqu''à 35 dB"],["Autonomie sans ANC","50 à 60 h"],["Autonomie avec ANC","30 à 40 h"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Écouteurs sans fil', 'ecouteurs-sans-fil', 'Écouteurs sans fil. Demandez-nous les modèles et coloris disponibles.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 8000, null, 10, 'neuf', null, null, false, false, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Montre connectée', 'montre-connectee', 'Montre connectée. Demandez-nous les modèles et coloris disponibles.', (select id from public.categories where slug = 'montres'), '', 25000, null, 8, 'neuf', null, null, false, true, true, array['/photos/provisoire/montres.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Chargeur sans fil', 'chargeur-sans-fil', 'Chargeur sans fil. Vérifiez avec nous la compatibilité avec votre téléphone.', (select id from public.categories where slug = 'accessoires'), '', 10000, null, 10, 'neuf', null, null, false, false, true, array['/photos/provisoire/accessoires.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Loupe d''écran', 'loupe-ecran', 'Loupe d''écran pour smartphone : l''image de votre téléphone en plus grand, pour vos vidéos.', (select id from public.categories where slug = 'gadgets'), '', 7000, null, 10, 'neuf', null, null, false, false, true, array['/photos/provisoire/gadgets.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;
