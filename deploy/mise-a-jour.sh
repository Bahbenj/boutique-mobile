#!/usr/bin/env bash
# =============================================================================
# Mise à jour du site sur le serveur privé (voir DEPLOIEMENT.md).
#   bash /srv/mobile-empire/repo/deploy/mise-a-jour.sh
#
# 1. git pull de la branche main dans /srv/mobile-empire/repo
# 2. copie de cette version dans un NOUVEAU dossier releases/<date>-<commit>
#    (le site en ligne continue de tourner pendant toute la construction)
# 3. npm ci + npm run build dans ce dossier
# 4. bascule du lien « current » puis redémarrage (une ou deux secondes)
# 5. contrôle : si le site ne répond pas, retour automatique à la version précédente
# 6. on garde les 3 dernières versions (retour arrière : deploy/retour-arriere.sh)
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/mobile-empire}"
BRANCH="${BRANCH:-main}"
KEEP="${KEEP:-3}"
REPO="$APP_DIR/repo"
ENV_FILE="$APP_DIR/shared/.env.production"

[ -f "$ENV_FILE" ] || { echo "✗ $ENV_FILE manquant (voir DEPLOIEMENT.md, étape 5)"; exit 1; }

echo "→ Récupération de la dernière version ($BRANCH)"
cd "$REPO"
git fetch --prune origin
git checkout -q "$BRANCH"
git pull --ff-only origin "$BRANCH"
SHA="$(git rev-parse --short HEAD)"
RELEASE="$APP_DIR/releases/$(date +%Y%m%d-%H%M%S)-$SHA"

echo "→ Construction de $SHA dans $RELEASE (le site actuel reste en ligne)"
mkdir -p "$RELEASE"
git archive HEAD | tar -x -C "$RELEASE"
ln -s "$ENV_FILE" "$RELEASE/.env.production"
cd "$RELEASE"
npm ci --include=dev --no-audit --no-fund
DEPLOYMENT_VERSION="$SHA" npm run build

PREVIOUS="$(readlink -f "$APP_DIR/current" 2>/dev/null || true)"
switch_to() {
  ln -sfn "$1" "$APP_DIR/current.tmp"
  mv -Tf "$APP_DIR/current.tmp" "$APP_DIR/current"
  DEPLOYMENT_VERSION="$2" pm2 startOrReload "$1/deploy/ecosystem.config.cjs" --update-env
  pm2 save >/dev/null
}
healthy() {
  for _ in $(seq 1 40); do
    if curl -fsS -o /dev/null http://127.0.0.1:3000/ && curl -fsS -o /dev/null http://127.0.0.1:3000/boutique; then return 0; fi
    sleep 1
  done
  return 1
}

echo "→ Mise en ligne de $SHA"
switch_to "$RELEASE" "$SHA"
if healthy; then
  echo "✓ Version $SHA en ligne"
else
  echo "✗ La nouvelle version ne répond pas (journal : pm2 logs mobile-empire)"
  if [ -n "$PREVIOUS" ] && [ -d "$PREVIOUS" ]; then
    echo "→ Retour à la version précédente : $(basename "$PREVIOUS")"
    switch_to "$PREVIOUS" "$(basename "$PREVIOUS" | sed 's/.*-//')"
  fi
  exit 1
fi

# Ménage : on garde les $KEEP dernières versions
ls -1dt "$APP_DIR"/releases/*/ | tail -n +"$((KEEP + 1))" | xargs -r rm -rf
echo "✓ Terminé. Versions disponibles :"
ls -1t "$APP_DIR/releases"
