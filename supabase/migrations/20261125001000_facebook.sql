-- =============================================================================
-- 10 · Mise à jour d'après la page Facebook de Mobile Empire
-- =============================================================================
-- Rejouable. Infos du magasin (clé « store ») modifiées seulement si elles
-- contiennent encore les valeurs posées par la migration 9 : une saisie du
-- commerçant n'est jamais écrasée.
-- TODO client : second numéro (73 92 31 35 ou 74 05 86 18) et horaires à confirmer.

update public.settings
  set value = value
    || case when value -> 'address' ->> 'street' = ''
         then jsonb_build_object('address', (value -> 'address') || jsonb_build_object('street', 'Près de l''école fondamentale'))
         else '{}'::jsonb end
    || case when value ? 'tagline' then '{}'::jsonb else '{ "tagline": "smartphone repair & E-commerce" }'::jsonb end
    || case when value ? 'description' then '{}'::jsonb
         else '{ "description": "Votre destination incontournable pour la réparation et la vente de matériel électronique à Bamako" }'::jsonb end
  where key = 'store';
