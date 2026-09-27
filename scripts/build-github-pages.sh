#!/usr/bin/env bash
# Static export for GitHub Pages. API routes need a server, so they are
# moved aside only for this build and restored afterwards.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

api="$root/src/app/api"
stash="$root/.pages-api-stash"

cleanup() {
  if [[ -d "$stash" ]]; then
    rm -rf "$api"
    mv "$stash" "$api"
  fi
}
trap cleanup EXIT

if [[ -d "$api" ]]; then
  rm -rf "$stash"
  mv "$api" "$stash"
fi

export GITHUB_PAGES=true
export NEXT_TELEMETRY_DISABLED=1
# Static Pages cannot run route handlers. Chat, diary analysis, and
# consistency expression call the public CloudBase service instead.
export NEXT_PUBLIC_API_BASE="${NEXT_PUBLIC_API_BASE:-https://littlemo-api-312607-7-1304965105.sh.run.tcloudbase.com}"
npm run build
