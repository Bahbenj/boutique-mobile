# Sauvegardes hebdomadaires

Supabase garde déjà des sauvegardes quotidiennes (offre payante) ou aucune (offre gratuite). Ce script en fait une **chez vous**, chaque semaine : base de données, comptes clients et photos, chiffrée, avec rotation.

| Contenu | Fichier |
| --- | --- |
| Produits, catégories, commandes, clients, réparations, avis, adresses, réglages, promotions, stock, journal (+ structure, fonctions, droits) | `base-public.dump(.gpg)` |
| Comptes de connexion (e-mails, mots de passe chiffrés, liens Google) | `comptes-auth.sql(.gpg)` |
| Photos (produits, catégories, avis) | `photos.tar(.gpg)` |
| Date, versions, nombre de produits, commandes, comptes, photos | `infos.txt` (lisible) |
| Empreintes de contrôle | `SHA256SUMS` |

Rotation : **8 hebdomadaires + 12 mensuelles** (la première de chaque mois, sans espace disque en plus). Une sauvegarde à moitié faite n'est jamais gardée.

## Installation (une fois, sur le serveur)

Sur un serveur installé avec `DEPLOIEMENT.md` (sinon, n'importe quelle machine Ubuntu avec Node 18+ ; avec Vercel, un petit serveur ou un ordinateur toujours allumé suffit).

```bash
# 1. Outils PostgreSQL 17 (pg_dump doit être de même version que Supabase, ou plus récente)
sudo apt -y install postgresql-common gnupg
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
sudo apt -y install postgresql-client-17
pg_dump --version

# 2. Réglages et phrase secrète
cp /srv/mobile-empire/repo/deploy/sauvegarde/sauvegarde.env.example /srv/mobile-empire/shared/sauvegarde.env
nano /srv/mobile-empire/shared/sauvegarde.env          # DATABASE_URL, SUPABASE_URL, clé secrète
chmod 600 /srv/mobile-empire/shared/sauvegarde.env
openssl rand -base64 32 > /srv/mobile-empire/shared/sauvegarde.phrase
chmod 600 /srv/mobile-empire/shared/sauvegarde.phrase
cat /srv/mobile-empire/shared/sauvegarde.phrase        # À RECOPIER dans votre gestionnaire de mots de passe
```

> **Sans la phrase secrète, les sauvegardes chiffrées sont illisibles.** Gardez-en une copie hors du serveur.

```bash
# 3. Premier essai, à la main
bash /srv/mobile-empire/repo/deploy/sauvegarde/sauvegarde.sh
cat /srv/mobile-empire/sauvegardes/hebdo/*/infos.txt

# 4. Tous les lundis à 3 h (heure du serveur)
crontab -e
```

Ajoutez cette ligne, enregistrez :

```
0 3 * * 1 bash /srv/mobile-empire/repo/deploy/sauvegarde/sauvegarde.sh >> /srv/mobile-empire/sauvegardes/journal.log 2>&1
```

### Copie hors du serveur (conseillé)

Une sauvegarde sur le même serveur que le site ne protège pas d'une panne du serveur. Avec **rclone** (Google Drive, Backblaze, Dropbox…) :

```bash
sudo apt -y install rclone
rclone config            # créez une destination, par exemple « gdrive »
```

Puis dans `sauvegarde.env` : `RCLONE_DESTINATION=gdrive:mobile-empire`. Le script refuse d'envoyer quoi que ce soit hors du serveur sans chiffrement.

## Vérifier qu'une sauvegarde est saine

```bash
cd /srv/mobile-empire/sauvegardes/hebdo/<date>
sha256sum -c SHA256SUMS                                   # « OK » sur chaque ligne
cat infos.txt
```

Une fois par trimestre, faites un **essai de restauration** dans un projet Supabase de test (ci-dessous) : une sauvegarde jamais restaurée n'est pas une sauvegarde.

## Restaurer

### 1. Déchiffrer

```bash
mkdir ~/restauration && cd ~/restauration
D=/srv/mobile-empire/sauvegardes/hebdo/<date>
P=/srv/mobile-empire/shared/sauvegarde.phrase
for f in base-public.dump comptes-auth.sql photos.tar; do
  gpg --batch --pinentry-mode loopback --passphrase-file "$P" --output "$f" --decrypt "$D/$f.gpg"
done
mkdir photos && tar -xf photos.tar -C photos
```

### 2. Dans un projet Supabase NEUF (panne, projet supprimé, ou essai)

Créez le projet, notez sa `DATABASE_URL` (Session pooler), puis **dans cet ordre** :

```bash
NEW="postgresql://postgres.<REF>:<MOT-DE-PASSE>@aws-0-<REGION>.pooler.supabase.com:5432/postgres"
# a. Comptes de connexion d'abord (les commandes et profils y font référence)
psql "$NEW" -v ON_ERROR_STOP=1 -f comptes-auth.sql
# b. Toute la base du site (tables, données, fonctions, règles de sécurité, droits)
pg_restore --no-owner --exit-on-error -d "$NEW" base-public.dump
```

c. Sur votre ordinateur, dans le dépôt : `npm run db:restauration`, puis collez `supabase/restauration.sql` dans **SQL Editor → Run**. Cela remet ce qui vit hors des tables du site (bucket des photos et ses règles, déclencheur de création des profils) **sans** réinstaller les produits d'exemple. Vérifiez ensuite **Admin → Paramètres → Zones** : une zone supprimée peut réapparaître, désactivez-la.

d. Photos :

```bash
SUPABASE_URL=https://<NOUVELLE-REF>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<clé secrète du nouveau projet> \
  node /srv/mobile-empire/repo/deploy/sauvegarde/photos.mjs restaurer ~/restauration/photos
```

e. Les photos gardent leur ancienne adresse (`https://<ANCIENNE-REF>.supabase.co/...`) dans les produits. Si l'ancien projet n'existe plus, dans **SQL Editor** :

```sql
update public.products set images = array(select replace(u, '<ANCIENNE-REF>', '<NOUVELLE-REF>') from unnest(images) u);
update public.categories set image = replace(image, '<ANCIENNE-REF>', '<NOUVELLE-REF>') where image is not null;
update public.product_reviews set photos = array(select replace(u, '<ANCIENNE-REF>', '<NOUVELLE-REF>') from unnest(photos) u);
```

f. Mettez les variables du site sur le nouveau projet (`NEXT_PUBLIC_SUPABASE_URL`, les deux clés), redéployez, et refaites dans le nouveau projet les réglages **Authentication** (SMTP, Google, URL : `supabase/README.md`, section 6 bis).

### 3. Récupérer quelques lignes effacées par erreur (sans tout écraser)

Restaurez la sauvegarde dans un **projet de test** (étape 2), retrouvez-y les lignes voulues, puis recopiez-les dans le vrai projet (SQL Editor, ou à la main dans l'admin). Ne lancez jamais `pg_restore --clean` sur le projet en service.
