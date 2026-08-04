#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${MIGRATION_BACKUP_DIR:-$REPO_ROOT/migration-backups}"
source_database_url="${OLD_DATABASE_URL:-${DATABASE_PUBLIC_URL:-}}"

if [[ -z "$source_database_url" ]]; then
  printf 'OLD_DATABASE_URL is required, or run through Railway with DATABASE_PUBLIC_URL available.\n' >&2
  exit 1
fi

sha256_write() {
  local file_path="$1"
  if command -v shasum >/dev/null 2>&1; then
    (cd "$(dirname "$file_path")" && shasum -a 256 "$(basename "$file_path")" > "$(basename "$file_path").sha256")
  elif command -v sha256sum >/dev/null 2>&1; then
    (cd "$(dirname "$file_path")" && sha256sum "$(basename "$file_path")" > "$(basename "$file_path").sha256")
  else
    printf 'shasum or sha256sum is required.\n' >&2
    exit 1
  fi
}

if command -v psql >/dev/null 2>&1; then
  server_version_num="$(psql "$source_database_url" -X -v ON_ERROR_STOP=1 -Atqc 'SHOW server_version_num')"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  server_version_num="$(docker run --rm \
    -e SOURCE_DATABASE_URL="$source_database_url" \
    postgres:18-bookworm \
    sh -ec 'psql "$SOURCE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "SHOW server_version_num"')"
else
  printf 'psql or a running Docker engine is required to inspect the source database.\n' >&2
  exit 1
fi
server_major="$((server_version_num / 10000))"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_path="$BACKUP_DIR/foodzone-$timestamp.dump"

use_local_dump=false
used_docker=false
if command -v pg_dump >/dev/null 2>&1; then
  dump_major="$(pg_dump --version | sed -E 's/.* ([0-9]+)(\.[0-9]+)?.*/\1/')"
  if [[ "$dump_major" -ge "$server_major" ]]; then
    use_local_dump=true
  fi
fi

printf 'Creating a consistent PostgreSQL archive...\n'
if [[ "$use_local_dump" == true ]]; then
  pg_dump "$source_database_url" \
    --format=custom --compress=9 --no-owner --no-privileges \
    --file="$dump_path"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [[ "$server_major" -gt 18 ]]; then
    printf 'Source PostgreSQL %s is newer than the pinned PostgreSQL 18 export container.\n' "$server_major" >&2
    exit 1
  fi
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e SOURCE_DATABASE_URL="$source_database_url" \
    -v "$BACKUP_DIR:/backup" \
    postgres:18-bookworm \
    sh -ec 'pg_dump "$SOURCE_DATABASE_URL" --format=custom --compress=9 --no-owner --no-privileges --file="/backup/$1"' \
    sh "$(basename "$dump_path")"
  used_docker=true
else
  printf 'pg_dump must be PostgreSQL %s or newer, or Docker must be available for the PostgreSQL 18 client.\n' "$server_major" >&2
  exit 1
fi

if [[ "$used_docker" == true ]]; then
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -v "$BACKUP_DIR:/backup:ro" \
    postgres:18-bookworm \
    pg_restore --list "/backup/$(basename "$dump_path")" >/dev/null
elif command -v pg_restore >/dev/null 2>&1; then
  pg_restore --list "$dump_path" >/dev/null
else
  printf 'pg_restore is required to verify the newly created archive.\n' >&2
  exit 1
fi
sha256_write "$dump_path"
chmod 600 "$dump_path" "$dump_path.sha256"

printf 'Database archive created and verified:\n%s\n' "$dump_path"
printf 'Keep this file encrypted and outside Git.\n'
