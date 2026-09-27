#!/usr/bin/env bash
# Build WeChat miniapp for production upload.
# Uses the existing CloudBase environment by default. Does not upload or submit review.
set -euo pipefail

CLOUDBASE_ENV_ID="${CLOUDBASE_ENV_ID:-littlemo-d2gy2ec0dd102163}"
export CLOUDBASE_ENV_ID
case "$CLOUDBASE_ENV_ID" in
  your-cloudbase-env-id|YOUR_CLOUDBASE_ENV_ID|YOUR_CLOUDBASE_ENV_ID_*|test-env)
    echo "error: replace the CloudBase environment placeholder with the real environment ID" >&2
    exit 1
    ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/scripts/check-legal-config.sh"
cd "$ROOT/apps/miniapp"

export CLOUDBASE_SERVICE_NAME="${CLOUDBASE_SERVICE_NAME:-littlemo-api}"
unset API_BASE_URL
echo "Building weapp through CloudBase service $CLOUDBASE_SERVICE_NAME"
npm run build:weapp

if ! node -e 'const c=require("./dist/project.config.json"); if (c.setting?.urlCheck !== true) process.exit(1)' ; then
  echo "error: production mini-program build must have setting.urlCheck=true" >&2
  exit 1
fi

if rg -n -i 'https?://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?|https?://api\\.example\\.com|https?://your-api-domain|your-cloudbase-env-id|YOUR_CLOUDBASE_ENV_ID' "$ROOT/apps/miniapp/dist" --glob '*.{js,json,wxml,wxss}' >/dev/null; then
  echo "error: development or placeholder origin found in production mini-program build" >&2
  exit 1
fi

for icon in chat chat-active diary diary-active insight insight-active mine mine-active; do
  if [[ ! -f "$ROOT/apps/miniapp/dist/assets/tab/$icon.png" ]]; then
    echo "error: missing tab icon in build output: assets/tab/$icon.png" >&2
    exit 1
  fi
done

echo ""
echo "Done. Open apps/miniapp in 微信开发者工具, set urlCheck=true for release, then 上传 → 提交审核 → 发布."
echo "See docs/cloudbase-go-live.md"
