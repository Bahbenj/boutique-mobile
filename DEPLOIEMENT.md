# Mettre Mobile Empire en ligne

Deux façons, au choix :

- **A. Vercel** : le plus simple, rien à administrer, mises à jour automatiques à chaque `git push`. Recommandé.
- **B. Serveur privé Linux** (VPS) : Node.js, PM2 et Caddy (ou Nginx), HTTPS automatique, mise à jour par `git pull`.

Dans les deux cas, la base de données reste chez **Supabase** (rien à installer pour elle).

---

## 0. Avant de commencer (dans les deux cas)

1. **Supabase prêt** : `supabase/all-in-one.sql` collé dans **SQL Editor → Run** (jusqu'à la migration 26 comprise), compte propriétaire créé. Voir `supabase/README.md`, sections 2 et 3.
2. **Nom de domaine** acheté (ex. `mobile-empire.ml`), avec accès à sa zone DNS.
3. **Les valeurs des variables** sous la main :

| Variable | Valeur | Où la trouver |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<REF>.supabase.co` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` / `publishable` | Supabase → Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` / `secret` (**secrète**) | même page, « Reveal » puis bouton « Copier » |
| `NEXT_PUBLIC_SITE_URL` | `https://www.mobile-empire.ml` (sans `/` final) | votre domaine |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `1` **au lancement seulement** (absente : Google n'indexe pas) | — |
| `NEXT_PUBLIC_DEMO_BANNER` | `1` pour une démo, sinon absente | — |
| `NEXT_PUBLIC_META_PIXEL_ID` | facultatif | Meta Events Manager |

Les variables `NEXT_PUBLIC_…` sont intégrées **au moment de la construction** : après un changement, il faut reconstruire (Vercel : *Redeploy* ; serveur : `deploy/mise-a-jour.sh`).

---

## A. Vercel

1. https://vercel.com → **Add New → Project** → importez le dépôt GitHub. Framework : **Next.js** (détecté), rien d'autre à changer.
2. **Environment Variables** : ajoutez les variables du tableau (cochez **Sensitive** pour `SUPABASE_SERVICE_ROLE_KEY`). Environnement : **Production** (et **Preview** si vous voulez des aperçus fonctionnels).
3. **Deploy**. Une fois terminé : **Settings → Functions → Function Region** : choisissez la région la plus proche de votre projet Supabase (Supabase → Project Settings → General → Region ; ex. `eu-west-3` Paris → `cdg1`). Redéployez.
4. **Settings → Domains** : ajoutez `www.mobile-empire.ml` et `mobile-empire.ml` (redirigé vers `www`) ; créez chez votre registraire les enregistrements DNS que Vercel affiche. HTTPS est automatique.
5. **Supabase → Authentication → URL Configuration** : *Site URL* = `https://www.mobile-empire.ml` ; *Redirect URLs* : ajoutez `https://www.mobile-empire.ml/compte/confirmer**`. **Google Cloud** : ajoutez le domaine dans *Authorized JavaScript origins* (voir `supabase/README.md`, section 6 bis).
6. **Vérifiez** (section C ci-dessous).

**Mises à jour** : `git push` sur `main` → Vercel reconstruit et met en ligne tout seul (2 à 3 minutes). **Retour arrière** : Vercel → **Deployments** → la version précédente → **⋯ → Instant Rollback**.

---

## B. Serveur privé Linux

Testé pour **Ubuntu 24.04 LTS**. Serveur conseillé : 2 processeurs, **2 Go de mémoire** (la construction du site en a besoin), 20 Go de disque. Les commandes se tapent dans un terminal connecté au serveur (`ssh`).

### 1. Le nom de domaine

Chez votre registraire, créez deux enregistrements **A** vers l'adresse IP du serveur : `www.mobile-empire.ml` et `mobile-empire.ml` (et **AAAA** si le serveur a une IPv6). Comptez jusqu'à une heure de propagation.

### 2. Sécuriser le serveur

```bash
sudo apt update && sudo apt -y upgrade
sudo adduser deploy                      # utilisateur dédié au site
sudo usermod -aG sudo deploy
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
# Mémoire d'appoint (utile pour la construction sur un petit serveur)
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Reconnectez-vous ensuite en `deploy` (`ssh deploy@<IP>`) pour toute la suite.

### 3. Node.js 22 (LTS) et PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt -y install nodejs git
node -v                                   # v22.x attendu
sudo npm install -g pm2
pm2 install pm2-logrotate                 # journaux limités en taille
```

### 4. Récupérer le code

Dépôt privé : créez une **clé de déploiement** en lecture seule.

```bash
ssh-keygen -t ed25519 -C "serveur mobile-empire" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Copiez la ligne affichée dans GitHub → dépôt → **Settings → Deploy keys → Add deploy key** (sans cocher l'écriture). Puis :

```bash
sudo mkdir -p /srv/mobile-empire/{releases,shared} && sudo chown -R deploy:deploy /srv/mobile-empire
git clone git@github.com:<VOTRE-COMPTE>/<VOTRE-DEPOT>.git /srv/mobile-empire/repo
```

### 5. Les variables (secrets)

```bash
nano /srv/mobile-empire/shared/.env.production
```

Collez les variables du tableau de la section 0, une par ligne (`NOM=valeur`, sans guillemets), enregistrez (Ctrl+O, Entrée, Ctrl+X), puis :

```bash
chmod 600 /srv/mobile-empire/shared/.env.production
```

Ce fichier ne quitte jamais le serveur et n'est jamais dans git.

### 6. Premier déploiement

```bash
bash /srv/mobile-empire/repo/deploy/mise-a-jour.sh
```

Le script construit le site dans `releases/<date>-<commit>`, fait pointer `current` dessus, démarre le site avec PM2 sur `127.0.0.1:3000` (invisible depuis Internet) et vérifie qu'il répond. Puis, pour qu'il redémarre avec le serveur :

```bash
pm2 startup systemd          # affiche une commande « sudo env PATH=… » : copiez-la et exécutez-la
pm2 save
```

### 7. HTTPS : Caddy (recommandé)

Caddy obtient et renouvelle seul le certificat HTTPS.

```bash
sudo apt -y install debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt -y install caddy
```

Dans `deploy/Caddyfile`, remplacez `mobile-empire.ml` par votre domaine (deux endroits), puis :

```bash
sudo cp /srv/mobile-empire/repo/deploy/Caddyfile /etc/caddy/Caddyfile
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy
sudo systemctl reload caddy
```

Ouvrez `https://www.<votre-domaine>` : le cadenas apparaît en moins d'une minute.

**Ou bien Nginx** (si vous le connaissez déjà) : `sudo apt -y install nginx certbot python3-certbot-nginx`, puis suivez les quatre commandes en tête de `deploy/nginx-mobile-empire.conf`. `certbot` installe le certificat et son renouvellement automatique (`sudo certbot renew --dry-run` pour vérifier).

> Les deux modèles **écrasent** l'en-tête `X-Real-IP` avec l'adresse réelle du visiteur : les limites anti-robots (inscription, connexion, codes promo, réparations) s'appuient dessus. Ne pas les retirer.

### 8. Supabase et Google

Comme pour Vercel (section A, étape 5) : *Site URL*, *Redirect URLs* `https://www.<domaine>/compte/confirmer**`, et origine Google.

### 9. Mettre à jour le site

Sur votre ordinateur : `git push`. Puis sur le serveur :

```bash
bash /srv/mobile-empire/repo/deploy/mise-a-jour.sh
```

`git pull`, construction dans un nouveau dossier (le site reste en ligne pendant ce temps), bascule (une ou deux secondes de coupure), contrôle, et **retour automatique** à l'ancienne version si la nouvelle ne répond pas. Les 3 dernières versions sont gardées.

**Retour arrière manuel** (quelques secondes, sans reconstruire) :

```bash
bash /srv/mobile-empire/repo/deploy/retour-arriere.sh                 # version précédente
ls -1t /srv/mobile-empire/releases                                    # versions disponibles
bash /srv/mobile-empire/repo/deploy/retour-arriere.sh <dossier>       # version choisie
```

Un retour arrière ne touche pas la base : une migration SQL déjà appliquée reste en place. Les migrations ajoutent sans rien retirer, mais une version du site bien plus ancienne qu'une migration peut mal fonctionner avec elle (ex. avant la migration 23, le site commandait sans compte client) : revenez seulement à la version immédiatement précédente.

### 10. Surveiller

```bash
pm2 status                       # le site tourne-t-il ?
pm2 logs mobile-empire --lines 100
pm2 monit                        # mémoire et processeur en direct
```

Conseillé : une sonde gratuite (ex. UptimeRobot) sur `https://www.<domaine>/` qui vous prévient par e-mail ou SMS si le site ne répond plus.

> **Une seule instance** de Node (`deploy/ecosystem.config.cjs`) : le cache du catalogue est en mémoire, deux instances afficheraient des prix différents après une modification dans l'admin. Un serveur 2 Go encaisse largement le trafic d'une boutique ; au-delà, passez à Vercel.

---

## C. Vérifications après chaque mise en ligne

```bash
curl -sI https://www.<domaine>/ | grep -iE "HTTP/|content-security|strict-transport|x-frame|x-robots"
curl -s https://www.<domaine>/robots.txt
```

- `HTTP/2 200` et les en-têtes de sécurité (CSP, HSTS, X-Frame-Options).
- Démo : `X-Robots-Tag: noindex` et `Disallow: /`. Lancement (`NEXT_PUBLIC_ALLOW_INDEXING=1`) : plus de `X-Robots-Tag`, `robots.txt` avec `Allow: /`.
- Sur un téléphone : accueil, une fiche produit, connexion, une commande test (puis annulez-la dans l'admin), une demande de réparation.
- Depuis un ordinateur, avec la base de recette : `npm run build && npm run test:e2e` (17 parcours, données de test effacées à la fin).

## D. Le jour du lancement

1. `NEXT_PUBLIC_SITE_URL` = le domaine définitif ; `NEXT_PUBLIC_ALLOW_INDEXING=1` ; supprimez `NEXT_PUBLIC_DEMO_BANNER`.
2. Reconstruisez (Vercel : *Redeploy* ; serveur : `deploy/mise-a-jour.sh`).
3. Supabase *URL Configuration* et Google Cloud sur le domaine définitif.
4. Section C, puis Google Search Console : ajoutez le domaine et demandez l'indexation de l'accueil.
5. Mettez en place les sauvegardes hebdomadaires et faites un premier essai de restauration (`deploy/sauvegarde/LISEZMOI.md`).
