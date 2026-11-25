# Mise en place de Supabase

À faire une seule fois, environ 15 minutes. Rien à installer sur l'ordinateur : tout se fait dans le navigateur.

## 1. Créer le projet

1. Créez un compte sur [supabase.com](https://supabase.com), puis **New project**.
2. Région : **West EU (Paris)** ou **Central EU (Frankfurt)**, les plus proches du Mali.
3. Choisissez un mot de passe de base de données fort et gardez-le dans un gestionnaire de mots de passe.

## 2. Exécuter les migrations

**Le plus simple :** ouvrez `supabase/all-in-one.sql`, copiez tout son contenu, collez-le dans **SQL Editor** et cliquez sur **Run**. Ce fichier contient toutes les migrations, puis les produits d'exemple, dans une seule transaction : en cas d'erreur, rien n'est appliqué. Vous pouvez le relancer sans risque, même sur une base déjà installée : il n'écrase jamais ce que vous avez saisi dans l'admin. Après toute modification d'un fichier SQL, régénérez-le avec `npm run db:all-in-one`.

**Ou bien, fichier par fichier :**

Dans Supabase : **SQL Editor** → **New query**. Pour chaque fichier de `supabase/migrations/`, **dans l'ordre** :

1. `20261124000100_schema.sql`
2. `20261124000200_security.sql`
3. `20261124000300_orders.sql`
4. `20261124000400_storage_settings.sql`
5. `20261124000500_storage_admin_select.sql` (permet de supprimer et remplacer des photos depuis l'admin)
6. `20261124000600_grants.sql` (droits d'accès des rôles de l'API). Indispensable sur les projets Supabase récents, qui n'en accordent plus automatiquement : sans elle, l'admin affiche « permission denied for table … ».
7. `20261125000700_dashboard.sql` (statistiques du tableau de bord)
8. `20261125000800_mali.sql` (francs CFA, zones de livraison du Mali, numéros +223, modes de paiement)
9. `20261125000900_mobile_empire.sql` (avis clients, paiement à la livraison seul par défaut, coordonnées du magasin)

Ouvrez le fichier, copiez tout son contenu, collez-le dans l'éditeur, cliquez sur **Run**. Vous devez obtenir « Success. No rows returned ».

Puis, pour les produits d'exemple, faites de même avec `supabase/seed.sql`. Ce fichier peut être relancé sans créer de doublons.

> Alternative en ligne de commande : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.

### Base déjà installée avec les anciens produits d'exemple

`seed.sql` n'écrase jamais un produit existant. Si votre base contient encore les 14 produits d'exemple de la première version (iPhone 15 Pro, Redmi Note 13 Pro…) et que vous ne les avez **pas** modifiés, supprimez-les puis relancez `supabase/seed.sql` pour obtenir les 9 nouveaux exemples Mobile Empire :

```sql
delete from public.products where slug in (
  'iphone-15-pro', 'samsung-galaxy-s24-ultra', 'iphone-13', 'samsung-galaxy-a55',
  'xiaomi-redmi-note-13-pro', 'iphone-12-pro-occasion', 'iphone-11-occasion', 'iphone-xs-occasion',
  'samsung-galaxy-s21-ultra-occasion', 'airpods-pro-2', 'ecouteurs-sans-fil-anc',
  'chargeur-rapide-usb-c-20w', 'coque-fibre-aramide', 'casque-bluetooth'
);
delete from public.categories where slug = 'neufs';
```

Les commandes déjà passées ne sont pas touchées (elles gardent une copie des articles). La catégorie « Accessoires » existante est conservée : renommez-la « Chargeurs et câbles » dans **Admin → Catégories** si vous le souhaitez.

## 3. Créer le compte administrateur

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Saisissez l'e-mail et un mot de passe fort, puis cochez **Auto Confirm User**.
3. Donnez-lui le rôle admin : **SQL Editor**, puis exécutez la requête suivante en remplaçant l'e-mail :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'vous@exemple.com';
```

Le résultat doit indiquer « 1 row ». Pour retirer l'accès : `delete from public.admins where user_id = (select id from auth.users where email = '…');`

4. Conseillé : **Authentication** → **Sign In / Providers** → désactivez **Allow new users to sign up**. Personne ne pourra alors créer de compte de lui-même.

## 4. Coller les clés

**Project Settings** → **API Keys** (ou **API**).

1. À la racine du projet, copiez `.env.example` en `.env.local`.
2. Remplissez les trois valeurs. **Copiez chaque clé avec le bouton « Copier » du tableau de bord**, en cliquant d'abord sur « Reveal » pour la clé secrète. Ne la sélectionnez pas à la main : l'affichage est raccourci, et une clé tronquée provoque l'erreur « Invalid API key ».
   - `NEXT_PUBLIC_SUPABASE_URL` : Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé `anon` / `publishable`
   - `SUPABASE_SERVICE_ROLE_KEY` : clé `service_role` / `secret`. **Elle est secrète** : ne l'envoyez à personne et ne la mettez jamais dans le code.
3. Redémarrez `npm run dev`.
4. En production, saisissez les mêmes trois variables chez l'hébergeur (par exemple Vercel → Settings → Environment Variables), puis redéployez.

## 5. Vérifier

Ouvrez `/admin` : la page de connexion s'affiche. Connectez-vous : le tableau de bord indique 9 produits, 6 catégories et 0 commande.

Puis :

- **Admin → Paramètres** : les 16 zones de livraison du Mali (communes de Bamako, régions) avec leurs frais d'exemple. **Saisissez vos vrais tarifs**, ajoutez des villes si besoin (« Ajouter une zone ») et désactivez celles que vous ne desservez pas. Seul le **paiement à la livraison** est activé ; les autres modes (Orange Money, Moov Money, Wave…) s'activent ici le jour venu, avec votre numéro. Chaque enregistrement s'applique immédiatement à la page Commande du site.
- **Admin → Avis clients** : vide au départ. La section « Avis » de l'accueil n'apparaît qu'après la publication d'un premier avis réel.

## 6. Meta Pixel (publicités Facebook / Instagram)

Facultatif. Dans **Meta Events Manager** → **Sources de données** → votre pixel, copiez son identifiant (une quinzaine de chiffres), puis ajoutez-le dans `.env.local` **et** chez l'hébergeur :

```
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

Redéployez (l'identifiant est intégré au moment de la compilation). Laissé vide, le pixel est désactivé et aucun script Facebook n'est chargé. Pour vérifier : extension **Meta Pixel Helper** de Chrome, ou **Events Manager** → **Tester les événements**. Événements envoyés : PageView, ViewContent (fiche produit), AddToCart, InitiateCheckout (page Commande) et Purchase + Lead (commande validée).
