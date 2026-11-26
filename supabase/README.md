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
10. `20261125001000_facebook.sql` (adresse, sous-titre et description repris de la page Facebook)
11. `20261125001100_storefront.sql` (pastille, livraison offerte et fond des photos par produit ; `place_order` applique la livraison offerte)
12. `20261125001200_order_history.sql` (historique des statuts de commande : qui et quand, lecture admin uniquement)
13. `20261125001300_repair_requests.sql` (demandes de réparation du formulaire de /reparation : création par le serveur seul, 3 demandes par heure et par numéro au plus ; l'admin ne modifie que le statut, le devis et les notes)
14. `20261125001400_dashboard_repairs.sql` (tableau de bord : statistiques des commandes et des demandes de réparation)
15. `20261125001500_products_admin.sql` (prix promo avec dates de début et de fin facultatives ; les anciens prix barrés deviennent des promos ; `place_order` facture le prix promo en cours et refuse un produit sans prix)
16. `20261125001600_categories_admin.sql` (catégories masquables : une catégorie masquée disparaît du site avec ses produits et ne peut plus être commandée ; une catégorie qui contient des produits ne peut plus être supprimée)
17. `20261125001700_promotions.sql` (promotions datées sur un produit, une catégorie ou tout le site ; codes promo avec minimum, nombre d'utilisations et expiration, appliqués par `place_order` ; la commande garde le code et la remise)
18. `20261125001800_stock.sql` (seuil « stock faible » réglable ; historique des mouvements de stock écrit par la base : ventes, annulations, ajustements avec motif, qui et quand)
19. `20261125001900_customers.sql` (liste des clients calculée à partir des commandes et des demandes de réparation, recherche par téléphone ou par nom, réservée à l'admin)
20. `20261125002000_team_roles.sql` (rôles Propriétaire, Gérant, Vendeur : les comptes déjà présents deviennent propriétaires ; le vendeur n'accède qu'aux commandes, réparations et stock ; seul le propriétaire gère l'équipe)
21. `20261126002100_activity_log.sql` (journal d'activité : chaque modification faite dans l'admin, avec son auteur et l'avant / après ; lisible par le propriétaire seul)
22. `20261126002200_promo_code_attempts.sql` (codes promo : 10 essais ratés par heure et par visiteur au plus, contre les devinettes ; l'adresse IP n'est jamais enregistrée, seulement une empreinte)
23. `20261126002300_customer_accounts.sql` (comptes clients : profils créés à l'inscription, commandes et réparations rattachées au compte, `place_order` réservé aux clients connectés à l'e-mail confirmé, chaque client ne voit que ses commandes, limites anti-robots)

Ouvrez le fichier, copiez tout son contenu, collez-le dans l'éditeur, cliquez sur **Run**. Vous devez obtenir « Success. No rows returned ».

Puis, pour les produits d'exemple, faites de même avec `supabase/seed.sql`. Ce fichier peut être relancé sans créer de doublons.

> Alternative en ligne de commande : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.

### Base déjà installée avec d'anciens produits d'exemple

`seed.sql` n'écrase jamais un produit existant. Si votre base contient encore des produits d'exemple des versions précédentes (iPhone 15 Pro, Tecno Camon 30, AirPods Pro…) et que vous ne les avez **pas** modifiés, supprimez-les puis relancez `supabase/seed.sql` pour obtenir les 11 exemples actuels (montre Yesido IO22, station de charge 3 en 1, mini batterie porte-clés…) :

```sql
delete from public.products where slug in (
  -- 1re version
  'iphone-15-pro', 'samsung-galaxy-s24-ultra', 'iphone-13', 'samsung-galaxy-a55',
  'xiaomi-redmi-note-13-pro', 'iphone-12-pro-occasion', 'iphone-11-occasion', 'iphone-xs-occasion',
  'samsung-galaxy-s21-ultra-occasion', 'airpods-pro-2', 'ecouteurs-sans-fil-anc',
  'chargeur-rapide-usb-c-20w', 'coque-fibre-aramide', 'casque-bluetooth',
  -- 2e version
  'tecno-camon-30', 'tecno-spark-20-pro', 'iphone-13-occasion', 'casque-bluetooth-oraimo',
  'coque-antichoc-verre-trempe', 'chargeur-samsung-25w',
  -- 3e version (renommés ou remplacés depuis les visuels du client)
  'casque-bluetooth-jbl', 'ecouteurs-jbl-tour-pro-2', 'montre-connectee', 'chargeur-sans-fil'
);
delete from public.categories c
  where slug in ('neufs', 'occasion', 'ecouteurs', 'casques')
    and not exists (select 1 from public.products p where p.category_id = c.id);
```

Les commandes déjà passées ne sont pas touchées (elles gardent une copie des articles). Une catégorie qui contient encore des produits n'est pas supprimée.

Les produits d'exemple utilisent les photos fournies par le client (`/photos/…webp`) ou, à défaut, des **visuels provisoires** (`/photos/provisoire/…svg`) à remplacer depuis l'admin. **Tous leurs prix sont à confirmer** avec le client.

### Ce qu'il faut exécuter (mise à jour de l'étape 4)

Dans **SQL Editor** → **New query** :

1. Collez **tout** `supabase/all-in-one.sql` → **Run**. Il applique les migrations manquantes (8 à 23) puis ajoute les produits d'exemple absents. Sans les migrations 8 à 23, le site public reste sur son catalogue de secours (`data/products.ts`) et les commandes ne sont pas enregistrées (envoi WhatsApp seul).
2. Si d'anciens produits d'exemple sont en base : requête de nettoyage ci-dessus, puis relancez `supabase/seed.sql` seul.
3. Vérifiez : `select slug, price, tag, free_delivery, image_bg from public.products order by created_at;` doit lister les 11 produits, dont `casque-bluetooth-super-bass` avec `Promo` et `true`.

Le site se met à jour tout seul : chaque modification dans l'admin invalide le cache du catalogue, et une commande passée sur le site apparaît dans **Admin → Commandes** avec son numéro.

## 3. Créer le compte administrateur

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Saisissez l'e-mail et un mot de passe fort, puis cochez **Auto Confirm User**.
3. Donnez-lui le rôle admin : **SQL Editor**, puis exécutez la requête suivante en remplaçant l'e-mail :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'vous@exemple.com';
```

Ce compte est **propriétaire** (rôle par défaut d'une ligne ajoutée ainsi). Les employés s'ajoutent ensuite depuis l'admin : **Paramètres → Équipe** (rôle Gérant ou Vendeur), sans passer par le SQL Editor.

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

Ouvrez `/admin` : la page de connexion s'affiche. Connectez-vous : le tableau de bord indique 11 produits, 6 catégories (Smartphones, Écouteurs et casques, Montres connectées, Chargeurs et câbles, Coques et protections, Gadgets) et 0 commande.

Puis :

- **Admin → Paramètres** : les 16 zones de livraison du Mali (communes de Bamako, régions) avec leurs frais d'exemple. **Saisissez vos vrais tarifs**, ajoutez des villes si besoin (« Ajouter une zone ») et désactivez celles que vous ne desservez pas. Seul le **paiement à la livraison** est activé ; les autres modes (Orange Money, Moov Money, Wave…) s'activent ici le jour venu, avec votre numéro. Chaque enregistrement s'applique immédiatement à la page Commande du site.
- **Admin → Avis clients** : vide au départ. La section « Avis » de l'accueil n'apparaît qu'après la publication d'un premier avis réel.

## 6. Meta Pixel (publicités Facebook / Instagram)

Facultatif. Dans **Meta Events Manager** → **Sources de données** → votre pixel, copiez son identifiant (une quinzaine de chiffres), puis ajoutez-le dans `.env.local` **et** chez l'hébergeur :

```
NEXT_PUBLIC_META_PIXEL_ID=123456789012345
```

Redéployez (l'identifiant est intégré au moment de la compilation). Laissé vide, le pixel est désactivé et aucun script Facebook n'est chargé. Pour vérifier : extension **Meta Pixel Helper** de Chrome, ou **Events Manager** → **Tester les événements**. Événements envoyés : PageView, ViewContent (fiche produit), AddToCart, InitiateCheckout (page Commande) et Purchase + Lead (commande validée).

## 6 bis. Comptes clients : réglages Google Cloud et Supabase

Les clients doivent avoir un compte pour **valider** une commande (le panier reste libre). À faire **une fois**, dans cet ordre. `<DOMAINE>` = l'adresse du site en ligne (ex. `https://www.mobile-empire.ml`), `<REF>` = l'identifiant du projet Supabase (dans son URL : `https://<REF>.supabase.co`).

### a. E-mails : un vrai serveur d'envoi (indispensable)

Sans réglage, Supabase n'envoie les e-mails (confirmation, lien de connexion, mot de passe oublié) **qu'aux membres de votre équipe Supabase**, et seulement quelques-uns par heure : vos clients ne les recevraient pas.

1. Créez un compte chez un service d'envoi d'e-mails (ex. Brevo ou Resend, offres gratuites suffisantes au début) et validez votre nom de domaine chez lui (il vous donne des lignes DNS à ajouter).
2. Supabase → **Authentication → Emails → SMTP Settings** → **Enable custom SMTP** : hôte, port, identifiant et mot de passe fournis par ce service ; expéditeur `Mobile Empire <ne-pas-repondre@votre-domaine>`.
3. **Authentication → Rate Limits** : « Rate limit for sending emails » à 30 par heure (augmentez si besoin).

### b. Google Cloud (bouton « Continuer avec Google »)

4. https://console.cloud.google.com → créez un projet « Mobile Empire ».
5. **Google Auth Platform → Branding** (écran de consentement) : nom de l'application « Mobile Empire », e-mail d'assistance, logo (facultatif), liens vers `<DOMAINE>`, `<DOMAINE>/confidentialite` et `<DOMAINE>/cgv` ; **Authorized domains** : votre domaine (ex. `mobile-empire.ml`) et `supabase.co`.
6. **Audience** : type **External**, puis **Publish app** (sinon seuls les « test users » peuvent se connecter).
7. **Data access** : gardez uniquement `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (pas de validation Google nécessaire pour ces trois-là).
8. **Clients → Create client** → **Web application**, nom « Site Mobile Empire » :
   - **Authorized JavaScript origins** : `<DOMAINE>` et `http://localhost:3000` ;
   - **Authorized redirect URIs** : `https://<REF>.supabase.co/auth/v1/callback`.
   Copiez le **Client ID** et le **Client secret**.

### c. Supabase → Authentication

9. **Sign In / Providers → Email** : activé ; **Confirm email** : activé ; **Secure email change** : activé ; **Minimum password length** : 8 ; **Password requirements** : lettres et chiffres. **Prevent use of leaked passwords** : activé si votre offre le permet.
10. **Sign In / Providers → Google** : activé ; collez le Client ID et le Client secret de l'étape 8. Laissez « Skip nonce checks » désactivé.
11. **URL Configuration** :
    - **Site URL** : `<DOMAINE>` ;
    - **Redirect URLs** (ajoutez les deux) : `<DOMAINE>/compte/confirmer**` et `http://localhost:3000/compte/confirmer**`.
12. **Emails → Templates** (remplacez le lien de chaque modèle ; le reste du texte est libre, en français) :
    - **Confirm signup** — sujet « Confirmez votre adresse e-mail » ; lien :
      `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirmer mon adresse</a>`
    - **Magic Link** — sujet « Votre lien de connexion » ; lien :
      `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Me connecter</a>`
    - **Reset Password** — sujet « Nouveau mot de passe » ; lien :
      `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Choisir un nouveau mot de passe</a>`
    Ces liens fonctionnent même si le client ouvre l'e-mail sur un autre appareil que celui de l'inscription.
13. **Attack Protection** (facultatif) : CAPTCHA (Cloudflare Turnstile) si des robots créent des comptes malgré les limites du site (5 inscriptions et 10 connexions ratées par heure et par appareil).

### d. Le site

14. Dans `.env.local` (et chez l'hébergeur) : `NEXT_PUBLIC_SITE_URL=<DOMAINE>` (sans `/` final), puis redéployez. En local, laissez vide.
15. Collez `supabase/all-in-one.sql` dans **SQL Editor** → **Run** (migration 23 : profils, commandes rattachées aux comptes).

## 7. Recette de bout en bout (à faire après chaque grande mise à jour)

Comptez 30 minutes. Notez ce qui ne se passe pas comme indiqué, avec une capture d'écran.

### A. Base de données

1. **SQL Editor → New query** : collez tout `supabase/all-in-one.sql` → **Run**. Attendu : « Success. No rows returned ». En cas d'erreur, rien n'est appliqué : envoyez le message d'erreur complet.
2. Vérifiez que tout est en place (chaque ligne doit afficher `true`) :
   ```sql
   select 'zones de livraison' as quoi, to_regclass('public.delivery_zones') is not null as ok
   union all select 'avis', to_regclass('public.reviews') is not null
   union all select 'historique des commandes', to_regclass('public.order_status_history') is not null
   union all select 'demandes de réparation', to_regclass('public.repair_requests') is not null
   union all select 'livraison offerte par produit', exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'free_delivery')
   union all select 'promo datée', exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'promo_ends_at')
   union all select 'catégories masquables', exists (select 1 from information_schema.columns where table_name = 'categories' and column_name = 'is_active')
   union all select 'promotions et codes promo', to_regclass('public.promo_codes') is not null
   union all select 'historique du stock', to_regclass('public.stock_movements') is not null
   union all select 'liste des clients', to_regprocedure('public.admin_customers(text, text, integer)') is not null
   union all select 'rôles d''équipe', exists (select 1 from information_schema.columns where table_name = 'admins' and column_name = 'role')
   union all select 'journal d''activité', to_regclass('public.activity_log') is not null
   union all select 'comptes clients', to_regclass('public.profiles') is not null
   union all select '11 produits ou plus', (select count(*) from public.products) >= 11;
   ```
3. Vérifiez votre compte admin (votre e-mail doit apparaître) :
   ```sql
   select u.email from public.admins a join auth.users u on u.id = a.user_id;
   ```
   Votre ligne doit afficher `owner`. Sinon, refaites l'étape 3 ci-dessus.

### B. Application

4. Dans `.env.local`, les trois clés Supabase sont remplies (dont `SUPABASE_SERVICE_ROLE_KEY` : sans elle, demandes de réparation, codes promo, limites anti-robots et suppression de compte ne fonctionnent pas). Arrêtez puis relancez `npm run dev` : le site relit alors la base au lieu du catalogue de secours.
5. Ouvrez `/boutique` : 11 produits. Dans **Admin → Produits**, changez le prix de la loupe d'écran (7 000 → 7 500), enregistrez, rechargez la fiche produit sur le site : le nouveau prix s'affiche. Remettez 7 000.

### B bis. Comptes clients (sur un téléphone, en navigation privée)

5 a. Ajoutez un produit au panier, touchez **Commander** sans être connecté : vous arrivez sur **Connexion** (« Connectez-vous pour valider votre commande : votre panier est gardé »).
5 b. **Créer un compte** avec une adresse e-mail à vous (nom, téléphone, mot de passe de 8 caractères, case CGV) : message « Presque fini ! Ouvrez le lien… ». Dans l'e-mail reçu (sujet « Confirmez votre adresse e-mail »), touchez le lien : vous revenez **directement à la commande, panier intact**, formulaire pré-rempli (nom, téléphone).
5 c. Sans confirmer l'e-mail, essayez de vous connecter avec un autre compte créé à l'instant : « Confirmez d'abord votre adresse e-mail », avec **Renvoyer l'e-mail de confirmation**.
5 d. Déconnexion (**Compte → Se déconnecter**), puis **Continuer avec Google** : choix du compte Google, puis page **Bienvenue** qui demande le téléphone et les CGV ; ensuite **Mon compte**.
5 e. Déconnexion, onglet **Lien par e-mail** : un lien de connexion arrive ; il connecte sans mot de passe.
5 f. **Mot de passe oublié** : le lien reçu ouvre **Nouveau mot de passe** ; connectez-vous ensuite avec le nouveau.
5 g. Sécurité de l'admin : connecté avec ce **compte client**, ouvrez `/admin` : retour à la page de connexion de l'admin ; saisissez les identifiants du compte client sur `/admin/login` : « Ce compte n'est pas autorisé à accéder à l'administration ».
5 h. Redirection : ouvrez `/compte/connexion?next=https://exemple.com` puis connectez-vous : vous arrivez sur **Mon compte**, jamais sur un autre site.
5 i. Onze mots de passe faux de suite sur la même adresse : « Trop d'essais depuis cet appareil. Réessayez dans une heure. »

### C. Commande

Connecté avec le compte client de l'étape 5 b (une commande exige désormais un compte).

6. Sur le site (de préférence sur un téléphone) : ajoutez le **Casque Bluetooth Super Bass** et la **Montre connectée Yesido IO22** au panier → **Commander** → zone **Région de Kayes**, votre propre numéro → **Valider la commande**. Attendu : écran « Commande CMD-… enregistrée », livraison **offerte** (grâce au casque), total 35 000 FCFA, message WhatsApp contenant le numéro CMD-….
7. Dans **Admin → Commandes** : la commande est en tête, statut « Nouvelle ». Ouvrez-la et vérifiez articles, totaux, zone, adresse.
8. Cliquez **Confirmer la commande** : l'historique affiche « Nouvelle → Confirmée » avec **votre e-mail**. Cliquez **WhatsApp** : le message parle de confirmation.
9. Cliquez **Bon de livraison** : logo bleu sur fond blanc, impression A4 lisible. Revenez à la liste, **Export CSV** : le fichier s'ouvre dans Excel avec la commande.
10. Notez le stock de la montre dans **Admin → Produits**, puis **Annulez** la commande : le stock de la montre remonte de 1, l'historique affiche « → Annulée ».

### D. Demande de réparation

11. Sur `/reparation`, formulaire **Demander un devis** : votre nom, votre numéro, « Tecno Spark 20 », « Écran cassé ». Attendez quelques secondes avant d'envoyer. Attendu : « Demande REP-… enregistrée » et message WhatsApp avec ce numéro.
12. Envoyez trois autres demandes avec le **même numéro** : la quatrième de l'heure doit être refusée (« Vous avez déjà envoyé plusieurs demandes… »).
13. **Admin → Réparations** : ouvrez la première demande, saisissez un devis de 25 000, une note interne, **Enregistrer**, puis **Devis envoyé**. Le bouton **WhatsApp** propose un message avec « 25 000 FCFA » ; la note interne n'y figure pas.

### E. Tableau de bord

14. **Admin → Tableau de bord** : « Réparations à traiter » compte les demandes encore « Nouvelle », « Dernières commandes » et « Dernières demandes » affichent vos essais, la commande annulée n'est pas comptée dans le chiffre d'affaires du jour.

### F. Gestion des produits (sur le téléphone)

15. **Admin → Produits** : chaque produit est une carte avec prix, stock et interrupteur « En vente ». Touchez le prix de la loupe d'écran, tapez 7500, ✓ : un message « Prix : 7 500 FCFA » apparaît avec **Annuler** ; touchez **Annuler**, le prix revient à 7 000.
16. Sur la même carte, **+** puis **−** sur le stock, puis l'interrupteur → « Masqué » : la loupe disparaît de `/boutique` (rechargez). Remettez-la **En vente**. L'étoile la met en avant sur l'accueil (retirez-la ensuite).
17. Cochez deux produits → barre du bas **Remise %…** → 10 % sans dates → **Appliquer** : leur carte affiche « Promo −10 % » et la boutique montre l'ancien prix barré. Recochez-les → **Remise %…** → **Arrêter les promos**.
18. Bouton **+ Ajouter un produit** : touchez **Ajouter** sans rien remplir, le message liste ce qui manque (photo, nom, catégorie, prix). Ajoutez une photo (appareil photo ou galerie), un nom « Test », une catégorie, un prix de 1 000 ; quittez la page sans enregistrer puis revenez : le brouillon est proposé (« Reprendre »). Enregistrez avec **Masqué** coché.
19. Dans la liste, sur la carte « Test », bouton **Dupliquer** (deux carrés) : une copie « Test (copie) » masquée s'ouvre. Sur chacune : **Retirer ce produit du site** → cochez la confirmation → **Supprimer définitivement**.
20. Ouvrez le **Casque Bluetooth Super Bass** : **Prix promo** 8 000 → **Enregistrer** : la boutique affiche 8 000 et 10 000 barré, « −20 % ». Mettez une **date de fin** d'hier et enregistrez : la boutique revient à 10 000 sans prix barré. Videz le prix promo et enregistrez.

### F bis. Catégories

20 a. **Admin → Catégories** : glissez la poignée ⠿ de « Gadgets » tout en haut, rechargez : l'ordre est gardé, et le menu de `/boutique` suit le même ordre. Remettez-la à sa place.
20 b. Interrupteur de « Gadgets » → **Masquée** : sur `/boutique`, la catégorie et la loupe d'écran disparaissent (rechargez) ; dans l'admin, la loupe reste visible, catégorie « Gadgets (masquée) ». Touchez **Annuler** dans le message (ou remettez l'interrupteur) : tout revient.
20 c. Corbeille de « Smartphones » : une fenêtre explique qu'elle contient des produits, avec **Voir ses produits** et **Masquer la catégorie** ; rien n'est supprimé.
20 d. **Nouvelle catégorie** « Test », **Créer la catégorie**, puis sa corbeille → **Supprimer** : elle disparaît.

### F ter. Promotions et codes promo

20 e. **Admin → Plus → Promotions → Nouvelle promotion** : « Test catégorie », 10 %, **Une catégorie** → Écouteurs et casques, sans dates → **Créer**. Sur `/boutique` (rechargez), les écouteurs et casques affichent le prix remisé et l'ancien prix barré. Désactivez-la avec l'interrupteur : les prix reviennent.
20 f. **Nouveau code** : `TEST10`, 10 %, achat minimum 20 000, 2 utilisations → **Créer le code**.
20 g. Sur le site, panier avec la **Montre connectée Yesido IO22** (25 000) → « Vous avez un code promo ? » → `test10` → **Appliquer** : −2 500 FCFA. Validez la commande (retrait en magasin) : écran à 22 500 FCFA, message WhatsApp avec la ligne « Code promo TEST10 ». Dans **Admin → Commandes**, la fiche et le bon de livraison montrent la remise.
20 h. Passez une 2e commande avec `TEST10`, puis essayez une 3e : « Ce code a déjà été utilisé le nombre de fois prévu ». Annulez une des deux commandes dans l'admin : le code redevient utilisable (« 1 utilisation sur 2 » dans Promotions).
20 i bis. Dans le panier, tapez 10 codes inventés (`FAUX1`, `FAUX2`…) : au 11e essai, « Trop d'essais de codes promo. Réessayez dans une heure. » Un vrai code est alors refusé aussi pendant une heure, depuis ce téléphone seulement.
20 i. Avec seulement un article à moins de 20 000 FCFA dans le panier, le code affiche « Encore … FCFA d'articles pour profiter de ce code » et n'est pas déduit. Supprimez ensuite la promotion et le code de test.

### F quater. Stock

20 j. **Admin → Plus → Stock** : réglez l'alerte « stock faible » à 5 → **Enregistrer** : le filtre « Stock faible » et le tableau de bord comptent les produits à 5 ou moins. Remettez 3.
20 k. Sur la ligne de la loupe d'écran, **+** deux fois, motif « Arrivage », **Enregistrer** : message « Stock : 10 → 12 » avec **Annuler**. Onglet **Historique** : « +2 Ajustement », votre e-mail, « « Arrivage » ». Touchez **Annuler** : une ligne « −2 » s'ajoute.
20 l. Après une commande sur le site (étape C), l'historique montre « Vente » (Commande en ligne) ; après son annulation dans l'admin, « Commande annulée » avec votre e-mail.

### F quinquies. Clients

20 m. **Admin → Plus → Clients** : votre numéro de test apparaît avec ses commandes (hors annulées), le total dépensé et ses demandes de réparation. Tapez les 4 derniers chiffres de votre numéro dans la recherche : seul votre client reste. Touchez « N commandes » : la liste des commandes s'ouvre filtrée sur ce numéro. Le bouton **WhatsApp** ouvre une conversation « Bonjour … ».

### F sexies. Paramètres et équipe

20 n. **Admin → Plus → Paramètres → Boutique** : changez les horaires (ex. « Lundi – Samedi », « 8h – 20h »), **Enregistrer**. Le pied de page et la page Contact du site affichent les nouveaux horaires (rechargez). Remettez les vrais horaires. Collez le lien « Partager » de Google Maps de la boutique : le bouton **Itinéraire** l'ouvre.
20 o. **Bandeau** : interrupteur **Affiché**, message « Test bandeau », lien `/boutique`, **Enregistrer** : la ligne dorée apparaît en haut de toutes les pages et mène à la boutique. Masquez-la ensuite.
20 p. **Équipe** : e-mail d'un second compte (le vôtre en `+vendeur`, ex. `vous+vendeur@gmail.com`), rôle **Vendeur**, **Créer son accès** : un mot de passe provisoire s'affiche avec **Envoyer par WhatsApp**. Dans une fenêtre de navigation privée, connectez-vous avec ce compte : seuls **Commandes**, **Réparations** et **Stock** apparaissent ; `/admin/produits` ou `/admin/parametres` renvoient vers les commandes. **Mon compte** permet de changer le mot de passe.
20 q. Avec le vendeur, faites avancer une commande (ex. Confirmée) : l'historique de la commande affiche l'e-mail du vendeur. Revenez au compte propriétaire, passez-le en **Gérant** puis **Retirer** : il ne peut plus ouvrir l'admin.

### F octies. Comptes clients dans l'admin

20 u. **Admin → Plus → Clients**, onglet **Comptes** : le compte de l'étape 5 b apparaît (nom, e-mail, téléphone, « E-mail » ou « Google », nombre de commandes et total). Vos comptes d'équipe n'y figurent jamais. L'onglet **Tous les numéros** garde la recherche par téléphone.
20 v. Ouvrez une commande passée avec ce compte : la fiche affiche **Compte client** avec son e-mail.
20 w. Côté client, **Mon compte** : la commande est listée ; touchez-la : articles, total et **Suivi** (Reçue → Confirmée…) sans aucun e-mail de l'équipe. Une demande de réparation envoyée connecté apparaît dans **Mes réparations**, sans les notes internes.
20 x. **Mon compte → Supprimer mon compte** avec une commande en cours : refusé. Après livraison (ou annulation) : tapez SUPPRIMER → retour à l'accueil, connexion impossible avec ce compte ; dans l'admin, la commande existe toujours, sans compte rattaché.

### F septies. Aide et journal

20 r. Sur le téléphone, la barre du bas affiche **Accueil, Commandes, Produits, Réparations, Plus** ; **Plus** commence par **+ Ajouter un produit** et se termine par **Guide rapide** (6 étapes illustrées). Sur la fiche d'un produit, touchez les **?** : une explication s'affiche.
20 s. Ouvrez une commande, touchez **Confirmer la commande** puis **Annuler** dans le message : elle revient à « Nouvelle ». Même geste sur une réparation.
20 t. **Plus → Journal d'activité** (propriétaire) : vos essais des étapes précédentes apparaissent, avec l'auteur et l'avant → après (ex. « prix : 7 000 FCFA → 7 500 FCFA »). Connecté en vendeur, cette page n'est pas proposée.

### G. Sécurité (depuis un ordinateur, PowerShell)

21. Remplacez `<URL>` par `NEXT_PUBLIC_SUPABASE_URL` et `<CLE_PUBLIQUE>` par `NEXT_PUBLIC_SUPABASE_ANON_KEY` (jamais la clé secrète) :
    ```powershell
    curl.exe -s "<URL>/rest/v1/orders?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s "<URL>/rest/v1/repair_requests?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s "<URL>/rest/v1/promo_codes?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s "<URL>/rest/v1/stock_movements?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s "<URL>/rest/v1/activity_log?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s "<URL>/rest/v1/promo_code_attempts?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s "<URL>/rest/v1/profiles?select=*" -H "apikey: <CLE_PUBLIQUE>"
    curl.exe -s -X POST "<URL>/rest/v1/rpc/place_order" -H "apikey: <CLE_PUBLIQUE>" -H "Content-Type: application/json" -d "{\"p_customer\":{},\"p_items\":[],\"p_delivery\":\"pickup\",\"p_payment\":\"cod\"}"
    curl.exe -s -X POST "<URL>/rest/v1/rpc/create_repair_request" -H "apikey: <CLE_PUBLIQUE>" -H "Content-Type: application/json" -d "{\"p_request\":{\"name\":\"Test\",\"phone\":\"76000000\",\"device\":\"X1\",\"issue\":\"test\"}}"
    ```
    Attendu pour les neuf : une erreur « permission denied » (code 42501), **jamais** de données.

### H. Nettoyage des essais

22. Une fois la recette terminée, supprimez les essais (commandes **annulées d'abord** dans l'admin, pour remettre le stock) :
    ```sql
    delete from public.orders where status = 'annulee' and phone = '<VOTRE NUMÉRO À 8 CHIFFRES>';
    delete from public.repair_requests where phone = '<VOTRE NUMÉRO À 8 CHIFFRES>';
    ```
    Les numéros CMD-… et REP-… continuent ensuite à partir du dernier utilisé : c'est normal.
