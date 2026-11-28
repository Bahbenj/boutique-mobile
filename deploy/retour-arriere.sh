#!/usr/bin/env bash
# =============================================================================
# Retour à une version précédente, sans rien reconstruire (quelques secondes).
#   bash /srv/mobile-empire/repo/deploy/retour-arriere.sh            → version précédente
#   bash /srv/mobile-empire/repo/deploy/retour-arriere.sh <dossier>  → version choisie
# Versions disponibles : ls -1t /srv/mobile-empire/releases
# La base Supabase n'est PAS touchée : une migration déjà appliquée reste en place.
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/mobile-empire}"
CURRENT="$(readlink -f "$APP_DIR/current")"

if [ $# -ge 1 ]; then
  TARGET="$APP_DIR/releases/$1"
else
  TARGET="$(ls -1dt "$APP_DIR"/releases/*/ | sed 's:/$::' | grep -vx "$CURRENT" | head -n 1 || true)"
fi
[ -n "$TARGET" ] && [ -d "$TARGET" ] || { echo "✗ Aucune version précédente trouvée"; ls -1t "$APP_DIR/releases"; exit 1; }

echo "→ Retour de $(basename "$CURRENT") à $(basename "$TARGET")"
ln -sfn "$TARGET" "$APP_DIR/current.tmp"
mv -Tf "$APP_DIR/current.tmp" "$APP_DIR/current"
DEPLOYMENT_VERSION="$(basename "$TARGET" | sed 's/.*-//')" pm2 startOrReload "$TARGET/deploy/ecosystem.config.cjs" --update-env
pm2 save >/dev/null
sleep 3
curl -fsS -o /dev/null http://127.0.0.1:3000/ && echo "✓ $(basename "$TARGET") en ligne" || { echo "✗ Le site ne répond pas : pm2 logs mobile-empire"; exit 1; }
