#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOURCE_DIR="${1:-$REPO_ROOT/server/uploads}"
BACKUP_DIR="${MIGRATION_BACKUP_DIR:-$REPO_ROOT/migration-backups}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  printf 'Uploads directory not found: %s\n' "$SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_path="$BACKUP_DIR/foodzone-uploads-$timestamp.tar.gz"

tar -C "$(dirname "$SOURCE_DIR")" -czf "$archive_path" "$(basename "$SOURCE_DIR")"
tar -tzf "$archive_path" >/dev/null
if command -v shasum >/dev/null 2>&1; then
  (cd "$BACKUP_DIR" && shasum -a 256 "$(basename "$archive_path")" > "$(basename "$archive_path").sha256")
elif command -v sha256sum >/dev/null 2>&1; then
  (cd "$BACKUP_DIR" && sha256sum "$(basename "$archive_path")" > "$(basename "$archive_path").sha256")
else
  printf 'shasum or sha256sum is required.\n' >&2
  exit 1
fi
chmod 600 "$archive_path" "$archive_path.sha256"

printf 'Uploads archive created and verified:\n%s\n' "$archive_path"
