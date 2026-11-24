# Mise en place de Supabase

À faire une seule fois, environ 15 minutes. Rien à installer sur l'ordinateur : tout se fait dans le navigateur.

## 1. Créer le projet

1. Créez un compte sur [supabase.com](https://supabase.com), puis **New project**.
2. Région : **Central EU (Frankfurt)** ou **West EU (Paris)**, les plus proches de la Tunisie.
3. Choisissez un mot de passe de base de données fort et gardez-le dans un gestionnaire de mots de passe.

## 2. Exécuter les migrations

**Le plus simple :** ouvrez `supabase/all-in-one.sql`, copiez tout son contenu, collez-le dans **SQL Editor** et cliquez sur **Run**. Ce fichier contient toutes les migrations, puis les produits d'exemple, dans une seule transaction : en cas d'erreur, rien n'est appliqué. Vous pouvez le relancer sans risque, même sur une base déjà installée. Après toute modification d'un fichier SQL, régénérez-le avec `npm run db:all-in-one`.

**Ou bien, fichier par fichier :**

Dans Supabase : **SQL Editor** → **New query**. Pour chaque fichier de `supabase/migrations/`, **dans l'ordre** :

1. `20261124000100_schema.sql`
2. `20261124000200_security.sql`
3. `20261124000300_orders.sql`
4. `20261124000400_storage_settings.sql`
5. `20261124000500_storage_admin_select.sql` (permet de supprimer et remplacer des photos depuis l'admin)
6. `20261124000600_grants.sql` (droits d'accès des rôles de l'API). Indispensable sur les projets Supabase récents, qui n'en accordent plus automatiquement : sans elle, l'admin affiche « permission denied for table … ».

Ouvrez le fichier, copiez tout son contenu, collez-le dans l'éditeur, cliquez sur **Run**. Vous devez obtenir « Success. No rows returned ».

Puis, pour les produits d'exemple, faites de même avec `supabase/seed.sql`. Ce fichier peut être relancé sans créer de doublons.

> Alternative en ligne de commande : `npx supabase link --project-ref <ref>` puis `npx supabase db push`.

## 3. Créer le compte administrateur

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Saisissez l'e-mail et un mot de passe fort, puis cochez **Auto Confirm User**.
3. Donnez-lui le rôle admin : **SQL Editor**, puis exécutez la requête suivante en remplaçant l'e-mail :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'vous@exemple.tn';
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

Ouvrez `/admin` : la page de connexion s'affiche. Connectez-vous : le tableau de bord indique 14 produits, 3 catégories et 0 commande.
