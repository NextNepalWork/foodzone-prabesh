#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

if [[ -z "${BACKEND_URL:-}" ]]; then
  printf 'BACKEND_URL is required, for example https://api.example.com\n' >&2
  exit 1
fi

backend_url="${BACKEND_URL%/}"
frontend_url="${FRONTEND_URL:-}"
temp_dir="$(mktemp -d)"
cleanup() { [[ -n "$temp_dir" && -d "$temp_dir" ]] && rm -rf "$temp_dir"; }
trap cleanup EXIT

curl -fsS --max-time 20 "$backend_url/api/health" -o "$temp_dir/health.json"
node -e "const d=require(process.argv[1]); if(d.success !== true) process.exit(1);" "$temp_dir/health.json"
printf 'PASS  backend health endpoint\n'

curl -fsS --max-time 30 "$backend_url/api/menu" -o "$temp_dir/menu.json"
node -e "const d=require(process.argv[1]); const rows=Array.isArray(d)?d:(d.data||d.items||[]); if(!Array.isArray(rows)||rows.length===0) process.exit(1); console.log('PASS  public menu endpoint ('+rows.length+' item(s))');" "$temp_dir/menu.json"

curl -fsS --max-time 20 "$backend_url/socket.io/?EIO=4&transport=polling" -o "$temp_dir/socket.txt"
if grep -q '^0' "$temp_dir/socket.txt"; then
  printf 'PASS  Socket.IO polling handshake\n'
else
  printf 'FAIL  Socket.IO polling handshake\n' >&2
  exit 1
fi

if [[ -n "$frontend_url" ]]; then
  curl -fsS --max-time 20 "${frontend_url%/}/admin" -o "$temp_dir/frontend.html"
  if grep -qi '<!doctype html' "$temp_dir/frontend.html"; then
    printf 'PASS  frontend admin route\n'
  else
    printf 'FAIL  frontend admin route did not return HTML\n' >&2
    exit 1
  fi
fi

printf '\nRead-only smoke tests passed. Complete authenticated checks in HOSTINGER-MIGRATION.md.\n'
