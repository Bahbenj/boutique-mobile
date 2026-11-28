#!/usr/bin/env bash
# =============================================================================
# Sauvegarde hebdomadaire de Mobile Empire (voir deploy/sauvegarde/LISEZMOI.md).
#   bash deploy/sauvegarde/sauvegarde.sh [fichier de réglages]
#
# Contenu de chaque sauvegarde (dossier hebdo/AAAA-MM-JJ/) :
#   base-public.dump     tout le site : produits, commandes, clients, réglages,
#                        avis, réparations… (pg_dump, format compressé)
#   comptes-auth.sql     comptes de connexion (auth.users, auth.identities)
#   photos.tar           photos du stockage (bucket catalog)
#   infos.txt            date, versions, nombre de lignes et de fichiers
#   SHA256SUMS           empreintes pour vérifier qu'aucun fichier n'est abîmé
# Chiffrés (.gpg, AES-256) si une phrase secrète est configurée : ils contiennent
# des données personnelles (noms, téléphones, adresses, e-mails).
#
# Rotation : les 8 dernières hebdomadaires + 1 par mois pendant 12 mois (réglable).
# Copie hors du serveur (fortement conseillée) : rclone, si RCLONE_DESTINATION est réglé.
# =============================================================================
set -euo pipefail
umask 077

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }
die() { log "✗ $*"; exit 1; }

load_settings() {
  local file="${1:-/srv/mobile-empire/shared/sauvegarde.env}"
  [ -f "$file" ] || die "réglages introuvables : $file (modèle : deploy/sauvegarde/sauvegarde.env.example)"
  # shellcheck disable=SC1090
  set -a; . "$file"; set +a
  : "${DATABASE_URL:?DATABASE_URL manquante}"
  : "${SUPABASE_URL:?SUPABASE_URL manquante}"
  : "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY manquante}"
  BACKUP_DIR="${BACKUP_DIR:-/srv/mobile-empire/sauvegardes}"
  KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
  KEEP_MONTHLY="${KEEP_MONTHLY:-12}"
  PASSPHRASE_FILE="${PASSPHRASE_FILE:-}"
  RCLONE_DESTINATION="${RCLONE_DESTINATION:-}"
  if [ -n "$RCLONE_DESTINATION" ] && [ -z "$PASSPHRASE_FILE" ]; then
    die "copie hors du serveur demandée sans chiffrement : réglez PASSPHRASE_FILE (données personnelles)"
  fi
  if [ -n "$PASSPHRASE_FILE" ] && [ ! -s "$PASSPHRASE_FILE" ]; then die "PASSPHRASE_FILE vide ou absent : $PASSPHRASE_FILE"; fi
}

dump_database() {
  local out="$1"
  command -v pg_dump >/dev/null || die "pg_dump absent : sudo apt install postgresql-client-17 (voir LISEZMOI.md)"
  # Droits (GRANT) gardés : la sécurité du site en dépend. Propriétaire retiré : restaurable ailleurs.
  log "→ base de données (schéma public)"
  pg_dump "$DATABASE_URL" --format=custom --compress=9 --no-owner --schema=public --file="$out/base-public.dump"
  log "→ comptes de connexion"
  pg_dump "$DATABASE_URL" --data-only --no-owner --no-privileges --table=auth.users --table=auth.identities --file="$out/comptes-auth.sql"
  {
    echo "Sauvegarde du $(date '+%F %T %Z')"
    echo "pg_dump : $(pg_dump --version)"
    psql "$DATABASE_URL" -XAtc "select 'Postgres : ' || version()" 2>/dev/null || true
    psql "$DATABASE_URL" -XAt <<'SQL' 2>/dev/null || true
select 'produits : ' || count(*) from public.products;
select 'commandes : ' || count(*) from public.orders;
select 'réparations : ' || count(*) from public.repair_requests;
select 'comptes : ' || count(*) from auth.users;
SQL
  } >"$out/infos.txt"
}

backup_photos() {
  local out="$1" mirror="$BACKUP_DIR/photos-miroir"
  log "→ photos du stockage (copie incrémentale)"
  SUPABASE_URL="$SUPABASE_URL" SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" node "$HERE/photos.mjs" copier "$mirror" | tee -a "$out/infos.txt"
  tar -cf "$out/photos.tar" -C "$mirror" .
}

seal() {
  local out="$1"
  (cd "$out" && sha256sum -- * >SHA256SUMS)
  if [ -n "$PASSPHRASE_FILE" ]; then
    log "→ chiffrement (AES-256)"
    local f
    for f in "$out"/*; do
      case "$f" in *.gpg | */SHA256SUMS | */infos.txt) continue ;; esac
      gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-file "$PASSPHRASE_FILE" \
        --symmetric --cipher-algo AES256 --output "$f.gpg" "$f"
      rm -f "$f"
    done
    (cd "$out" && sha256sum -- *.gpg infos.txt >SHA256SUMS)
  fi
}

# Garde les N dossiers les plus récents (noms datés : l'ordre alphabétique est chronologique)
rotate() {
  local dir="$1" keep="$2"
  [ -d "$dir" ] || return 0
  find "$dir" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | head -n -"$keep" | while read -r old; do
    log "→ suppression de l'ancienne sauvegarde $(basename "$dir")/$old"
    rm -rf "${dir:?}/$old"
  done
}

# Une sauvegarde mensuelle : la première de chaque mois (liens physiques, aucun espace en plus)
monthly_copy() {
  local week="$1" month
  month="$(basename "$week" | cut -c1-7)"
  mkdir -p "$BACKUP_DIR/mensuel"
  if [ ! -d "$BACKUP_DIR/mensuel/$month" ]; then
    log "→ sauvegarde mensuelle $month"
    cp -al "$week" "$BACKUP_DIR/mensuel/$month"
  fi
}

main() {
  load_settings "${1:-}"
  local today out
  today="$(date +%F)"
  out="$BACKUP_DIR/hebdo/$today"
  mkdir -p "$BACKUP_DIR/hebdo"
  rm -rf "$out.partiel" && mkdir -p "$out.partiel"
  log "Sauvegarde dans $out"
  dump_database "$out.partiel"
  backup_photos "$out.partiel"
  seal "$out.partiel"
  rm -rf "$out" && mv "$out.partiel" "$out"   # dossier complet seulement : jamais de demi-sauvegarde
  monthly_copy "$out"
  rotate "$BACKUP_DIR/hebdo" "$KEEP_WEEKLY"
  rotate "$BACKUP_DIR/mensuel" "$KEEP_MONTHLY"
  if [ -n "$RCLONE_DESTINATION" ]; then
    log "→ copie hors du serveur : $RCLONE_DESTINATION"
    rclone sync "$BACKUP_DIR" "$RCLONE_DESTINATION" --exclude "photos-miroir/**" --exclude "*.partiel/**"
  fi
  log "✓ Sauvegarde terminée : $(du -sh "$out" | cut -f1) ($out)"
}

# Exécuté directement (pas quand le fichier est chargé par un test)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
