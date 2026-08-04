#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

if [[ "$#" -ne 1 || ! -f "$1" ]]; then
  printf 'Usage: %s /path/to/foodzone-uploads-TIMESTAMP.tar.gz\n' "$0" >&2
  exit 1
fi

archive_path="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
checksum_path="$archive_path.sha256"
if [[ -f "$checksum_path" ]]; then
  if command -v shasum >/dev/null 2>&1; then
    (cd "$(dirname "$archive_path")" && shasum -a 256 -c "$(basename "$checksum_path")")
  else
    (cd "$(dirname "$archive_path")" && sha256sum -c "$(basename "$checksum_path")")
  fi
fi
tar -tzf "$archive_path" >/dev/null
if tar -tzf "$archive_path" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  printf 'Refusing to restore: uploads archive contains an unsafe path.\n' >&2
  exit 1
fi

docker volume create foodzone_uploads >/dev/null
if [[ -n "$(docker run --rm -v foodzone_uploads:/data alpine:3.22 sh -c 'ls -A /data')" ]]; then
  printf 'Refusing to restore: foodzone_uploads is not empty.\n' >&2
  exit 1
fi

docker run --rm \
  -e ARCHIVE_NAME="$(basename "$archive_path")" \
  -v foodzone_uploads:/data \
  -v "$(dirname "$archive_path"):/backup:ro" \
  alpine:3.22 \
  sh -ec 'tar -xzf "/backup/$ARCHIVE_NAME" -C /data --strip-components=1 && chown -R 1000:1000 /data'

printf 'Uploads restored into the persistent foodzone_uploads volume.\n'
