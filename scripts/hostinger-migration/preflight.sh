#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

failures=0
pass() { printf 'PASS  %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; failures=$((failures + 1)); }

for command_name in curl git docker; do
  if command -v "$command_name" >/dev/null 2>&1; then
    pass "$command_name is installed"
  else
    fail "$command_name is required but not installed"
  fi
done

for optional_command in node npm pg_dump pg_restore psql; do
  if command -v "$optional_command" >/dev/null 2>&1; then
    pass "$optional_command is installed"
  else
    warn "$optional_command is not installed on the host; Docker supplies it for deployment"
  fi
done

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    pass "Docker Compose is installed"
  else
    fail "Docker Compose v2 is required"
  fi

  if docker info >/dev/null 2>&1; then
    pass "Docker engine is available"
  else
    fail "Docker engine is not running or the current user cannot access it"
  fi
fi

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$node_major" -ge 20 && "$node_major" -lt 25 ]]; then
    pass "Node $(node --version) matches the supported 20-24 range"
  else
    fail "Node $(node --version) is outside the supported 20-24 range"
  fi
fi

if [[ -f .env.hostinger ]]; then
  pass ".env.hostinger is present"
  if grep -q 'replace-with-' .env.hostinger; then
    fail ".env.hostinger still contains placeholder values"
  else
    pass ".env.hostinger has no template placeholders"
  fi
else
  fail ".env.hostinger is missing; copy hostinger.env.example and fill it securely"
fi

if [[ "$(git branch --show-current)" == "main" ]]; then
  pass "current branch is main"
else
  warn "current branch is $(git branch --show-current); production normally deploys main"
fi

if [[ -z "$(git status --porcelain)" ]]; then
  pass "working tree is clean"
else
  warn "working tree has uncommitted changes"
fi

tracked_secrets="$(git ls-files | grep -E '(^|/)\.env($|\.)' | grep -Ev '(\.example|\.template)$' || true)"
if [[ -z "$tracked_secrets" ]]; then
  pass "no real environment files are tracked"
else
  fail "tracked environment files detected: $tracked_secrets"
fi

tracked_uploads="$(git ls-files server/uploads || true)"
if [[ -z "$tracked_uploads" ]]; then
  pass "runtime uploads are not tracked by Git"
else
  fail "runtime uploads are tracked by Git and must be untracked before migration"
fi

for required_file in Dockerfile Caddyfile docker-compose.hostinger.yml hostinger.env.example HOSTINGER-MIGRATION.md; do
  if [[ -f "$required_file" ]]; then
    pass "$required_file is present"
  else
    fail "$required_file is missing"
  fi
done

if git check-ignore -q migration-backups/test.dump; then
  pass "migration-backups is ignored by Git"
else
  fail "migration-backups must be ignored by Git"
fi

if git check-ignore -q .env.hostinger; then
  pass ".env.hostinger is ignored by Git"
else
  fail ".env.hostinger must be ignored by Git"
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 && [[ -f .env.hostinger ]]; then
  if docker compose \
      --env-file .env.hostinger \
      -f docker-compose.hostinger.yml config >/dev/null 2>&1; then
    pass "Hostinger Compose configuration is valid"
  else
    fail "Hostinger Compose configuration is invalid"
  fi
fi

upload_count="$(find server/uploads -type f 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$upload_count" -gt 0 ]]; then
  warn "$upload_count local upload file(s) require a separate archive/volume migration"
else
  pass "no local upload files require migration"
fi

if [[ "$failures" -gt 0 ]]; then
  printf '\nPreflight failed with %s blocking issue(s).\n' "$failures" >&2
  exit 1
fi

printf '\nPreflight passed. Resolve WARN items before production cutover.\n'
