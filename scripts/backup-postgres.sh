#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-backups}
COMPOSE_PROJECT=${COMPOSE_PROJECT:-vhvtv-panel}
DB_NAME=${POSTGRES_DB:-vhv_monitor}
DB_USER=${POSTGRES_USER:-vhv_monitor}
RECIPIENT=${AGE_RECIPIENT:-}
PASSPHRASE_FILE=${BACKUP_PASSPHRASE_FILE:-}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
mkdir -p "$BACKUP_DIR"
ts=$(date -u +%Y%m%dT%H%M%SZ)
out="$BACKUP_DIR/postgres-$ts.dump"

docker compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$out"
if command -v age >/dev/null 2>&1 && [[ -n "$RECIPIENT" ]]; then
  age -r "$RECIPIENT" -o "$out.age" "$out" && shred -u "$out"
elif command -v gpg >/dev/null 2>&1 && [[ -n "$PASSPHRASE_FILE" ]]; then
  gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-file "$PASSPHRASE_FILE" -o "$out.gpg" "$out" && shred -u "$out"
else
  echo "Refusing to leave unencrypted backup. Set AGE_RECIPIENT or BACKUP_PASSPHRASE_FILE." >&2
  shred -u "$out"
  exit 1
fi

# Retain encrypted backups only for the configured privacy window.
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'postgres-*.dump.age' -o -name 'postgres-*.dump.gpg' \) -mtime +"$BACKUP_RETENTION_DAYS" -delete
