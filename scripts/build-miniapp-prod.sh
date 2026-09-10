#!/usr/bin/env bash
# Build WeChat miniapp for production upload.
# Requires API_BASE_URL (https://your-api-domain). Does not upload or submit review.
set -euo pipefail

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "error: set API_BASE_URL to your HTTPS API origin, e.g." >&2
  echo "  API_BASE_URL=https://your-api-domain ./scripts/build-miniapp-prod.sh" >&2
  exit 1
fi

case "$API_BASE_URL" in
  https://*) ;;
  *)
    echo "error: API_BASE_URL must be https://… for release builds (got: $API_BASE_URL)" >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/miniapp"

export API_BASE_URL
# Prefer explicit env over a stale local .env for this one-shot build
echo "Building weapp with API_BASE_URL=$API_BASE_URL"
npm run build:weapp

echo ""
echo "Done. Open apps/miniapp in 微信开发者工具, set urlCheck=true for release, then 上传 → 提交审核 → 发布."
echo "See docs/cloudbase-go-live.md"
