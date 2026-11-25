-- Généré par scripts/generate-seed.ts depuis data/products.ts : ne pas modifier à la main.
-- Produits et catégories d'exemple (photos Unsplash de remplacement).

insert into public.categories (name, slug, description, image, position) values
  ('Smartphones', 'smartphones', 'Samsung, Tecno et autres marques.', '/photos/provisoire/smartphones.svg', 0),
  ('Écouteurs et casques', 'ecouteurs-casques', 'Écouteurs sans fil et casques Bluetooth.', '/photos/casque-anc-yesido-640.webp', 1),
  ('Montres connectées', 'montres', 'Montres connectées pour tous les jours.', '/photos/montre-yesido-io22-600.webp', 2),
  ('Chargeurs et câbles', 'accessoires', 'Chargeurs, chargeurs sans fil et câbles.', '/photos/station-charge-3en1-627.webp', 3),
  ('Coques et protections', 'protections', 'Coques et protections d''écran.', '/photos/provisoire/protections.svg', 4),
  ('Gadgets', 'gadgets', 'Loupes d''écran et petits accessoires malins.', '/photos/provisoire/gadgets.svg', 5)
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Smartphone Samsung Galaxy', 'smartphone-samsung', 'Smartphone Samsung neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.', (select id from public.categories where slug = 'smartphones'), 'Samsung', 100000, null, 5, 'neuf', null, null, false, true, true, array['/photos/provisoire/smartphones.svg']::text[], '{}'::jsonb, array['Modèle et capacité à préciser']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Smartphone Tecno', 'smartphone-tecno', 'Smartphone Tecno neuf. Demandez-nous sur WhatsApp les modèles disponibles en magasin.', (select id from public.categories where slug = 'smartphones'), 'Tecno', 80000, null, 5, 'neuf', null, null, false, false, true, array['/photos/provisoire/smartphones.svg']::text[], '{}'::jsonb, array['Modèle et capacité à préciser']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Casque Bluetooth Super Bass', 'casque-bluetooth-super-bass', 'Casque Bluetooth aux basses renforcées, en promotion avec la livraison offerte.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 10000, null, 10, 'neuf', null, null, false, true, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, array['Bluetooth', 'Super Bass', 'Livraison offerte']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Casque Bluetooth ANC Yesido', 'casque-bluetooth-anc-yesido', 'Casque Bluetooth Yesido à réduction de bruit active.', (select id from public.categories where slug = 'ecouteurs-casques'), 'Yesido', 25000, null, 5, 'neuf', null, null, false, true, true, array['/photos/casque-anc-yesido-640.webp']::text[], '{}'::jsonb, array['Réduction de bruit active (ANC)', 'Bluetooth']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Écouteurs à conduction d''air Yesido', 'ecouteurs-conduction-air-yesido', 'Le son sans rien dans l''oreille, dans un format léger.', (select id from public.categories where slug = 'ecouteurs-casques'), 'Yesido', 15000, null, 5, 'neuf', null, null, true, true, true, array['/photos/ecouteurs-conduction-yesido-640.webp']::text[], '{}'::jsonb, array['Hors de l''oreille', 'Bluetooth 5.3', '10 h d''autonomie']::text[], '[["Type","Conduction d''air, hors de l''oreille"],["Connexion","Bluetooth 5.3"],["Autonomie","10 h"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Écouteurs sans fil', 'ecouteurs-sans-fil', 'Écouteurs sans fil avec leur boîtier de charge. Demandez-nous les modèles et coloris disponibles.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 15000, null, 10, 'neuf', null, null, false, false, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Casque ANC EP07', 'casque-anc-ep07', 'Casque à réduction de bruit active : coupez-vous du bruit et profitez de votre musique.', (select id from public.categories where slug = 'ecouteurs-casques'), '', 20000, null, 10, 'neuf', null, null, false, false, true, array['/photos/provisoire/ecouteurs-casques.svg']::text[], '{}'::jsonb, array['Réduction de bruit 35 dB', 'Bluetooth 5.3', 'Jusqu''à 60 h d''autonomie']::text[], '[["Connexion","Bluetooth 5.3"],["Réduction de bruit","Active (ANC), jusqu''à 35 dB"],["Autonomie sans ANC","50 à 60 h"],["Autonomie avec ANC","30 à 40 h"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Montre connectée Yesido IO22', 'montre-connectee-yesido-io22', 'Une montre connectée légère et moderne : santé, sport et notifications au poignet, jusqu''à 5 jours sans recharge.', (select id from public.categories where slug = 'montres'), 'Yesido', 25000, null, 8, 'neuf', null, null, true, true, true, array['/photos/montre-yesido-io22-600.webp']::text[], '{}'::jsonb, array['Deux bracelets', 'Jusqu''à 5 jours d''autonomie', 'Résistante à l''eau IP67']::text[], '[["Écran","Tactile HD, haute résolution, lisible même en plein soleil"],["Santé","Fréquence cardiaque, sommeil, pas et calories brûlées, entraînement multisports"],["Notifications","Appels, SMS et réseaux sociaux (WhatsApp, Facebook…)"],["Connexion","Bluetooth, compatible iOS et Android"],["Autonomie","Jusqu''à 5 jours d''utilisation, 30 jours en veille"],["Bracelet","Silicone ou métal, deux couleurs"],["Étanchéité","IP67"],["Autres","Contrôle de la musique, rappel de sédentarité, chronomètre et alarmes, localisation du téléphone"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Station de charge sans fil 3 en 1', 'station-charge-sans-fil-3-en-1', 'Rechargez plusieurs appareils au même endroit, montre comprise, sur une seule station. Vérifiez avec nous la compatibilité avec vos appareils.', (select id from public.categories where slug = 'accessoires'), '', 15000, null, 5, 'neuf', null, null, false, true, true, array['/photos/station-charge-3en1-627.webp']::text[], '{}'::jsonb, array['Charge sans fil', 'Support de montre', '3 en 1']::text[], '[]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Mini batterie porte-clés', 'mini-batterie-porte-cles', 'Une batterie d''appoint qui tient sur votre trousseau de clés, pour Android comme pour iPhone.', (select id from public.categories where slug = 'accessoires'), '', 7500, null, 12, 'neuf', null, null, false, false, true, array['/photos/batterie-porte-cles-640.webp']::text[], '{"colors":[{"name":"Noir / rouge","hex":"#9b2c33"},{"name":"Noir / argent","hex":"#2b2d31"},{"name":"Blanc","hex":"#f2f2f0"},{"name":"Rose","hex":"#f2c9cc"}]}'::jsonb, array['USB-C + Lightning', 'Format porte-clés', '4 coloris']::text[], '[["Connecteurs","USB-C et Lightning intégrés"]]'::jsonb
on conflict (slug) do nothing;

insert into public.products (name, slug, description, category_id, brand, price, old_price, stock, condition, grade, battery, is_new, is_featured, is_active, images, variants, highlights, specs)
select 'Loupe d''écran', 'loupe-ecran', 'Loupe d''écran pour smartphone : l''image de votre téléphone en plus grand, pour vos vidéos.', (select id from public.categories where slug = 'gadgets'), '', 7000, null, 10, 'neuf', null, null, false, false, true, array['/photos/provisoire/gadgets.svg']::text[], '{}'::jsonb, '{}'::text[], '[]'::jsonb
on conflict (slug) do nothing;
