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
npm run build
