#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${HOSTINGER_ENV_FILE:-$REPO_ROOT/.env.hostinger}"
COMPOSE_FILE="$REPO_ROOT/docker-compose.hostinger.yml"

if [[ "$#" -ne 1 || ! -f "$1" ]]; then
  printf 'Usage: %s /path/to/foodzone-TIMESTAMP.dump\n' "$0" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Hostinger environment file not found: %s\n' "$ENV_FILE" >&2
  exit 1
fi

dump_path="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
checksum_path="$dump_path.sha256"
if [[ -f "$checksum_path" ]]; then
  if command -v shasum >/dev/null 2>&1; then
    (cd "$(dirname "$dump_path")" && shasum -a 256 -c "$(basename "$checksum_path")")
  else
    (cd "$(dirname "$dump_path")" && sha256sum -c "$(basename "$checksum_path")")
  fi
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
"${compose[@]}" up -d db

existing_tables="$("${compose[@]}" exec -T db sh -ec \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema = '\''public'\'' AND table_type = '\''BASE TABLE'\''"')"

if [[ "$existing_tables" != "0" ]]; then
  printf 'Refusing to restore: target public schema already contains %s table(s).\n' "$existing_tables" >&2
  printf 'Use a fresh PostgreSQL volume; this script never overwrites existing data.\n' >&2
  exit 1
fi

printf 'Restoring the verified archive into Hostinger PostgreSQL...\n'
"${compose[@]}" exec -T db sh -ec \
  'pg_restore --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --no-owner --no-privileges --exit-on-error' \
  < "$dump_path"
"${compose[@]}" exec -T db sh -ec \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "ANALYZE;"' >/dev/null

printf 'Database restore completed. Verify source and target before starting the app.\n'
