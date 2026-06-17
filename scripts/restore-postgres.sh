#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup.dump|backup.dump.age|backup.dump.gpg>" >&2
  exit 64
fi

backup=$1
DB_NAME=${POSTGRES_DB:-vhv_monitor}
DB_USER=${POSTGRES_USER:-vhv_monitor}
IDENTITY=${AGE_IDENTITY_FILE:-}
PASSPHRASE_FILE=${BACKUP_PASSPHRASE_FILE:-}
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

case "$backup" in
  *.age)
    age_args=(-d -o "$tmp")
    [[ -n "$IDENTITY" ]] && age_args=(-d -i "$IDENTITY" -o "$tmp")
    age "${age_args[@]}" "$backup"
    ;;
  *.gpg)
    gpg_args=(--batch --yes --decrypt -o "$tmp")
    [[ -n "$PASSPHRASE_FILE" ]] && gpg_args=(--batch --yes --decrypt --passphrase-file "$PASSPHRASE_FILE" -o "$tmp")
    gpg "${gpg_args[@]}" "$backup"
    ;;
  *) cp "$backup" "$tmp" ;;
esac

cat "$tmp" | docker compose exec -T postgres pg_restore --clean --if-exists --no-owner -U "$DB_USER" -d "$DB_NAME"
