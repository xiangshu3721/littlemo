#!/usr/bin/env bash
# Apply CloudBase / production secrets when they are present in the environment.
# Does not print secret values. Does not commit anything.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
missing=0

need() {
  if [[ -z "${!1:-}" ]]; then
    echo "missing: $1" >&2
    missing=1
  fi
}

need CLOUDBASE_ENV_ID
need CLOUDBASE_SERVICE_NAME
need DATABASE_URL
need JWT_SECRET
need DEEPSEEK_API_KEY

if [[ "${CLOUDBASE_SERVICE_NAME:-}" != "littlemo-api" ]]; then
  echo "invalid: CLOUDBASE_SERVICE_NAME must be littlemo-api" >&2
  missing=1
fi
if [[ -n "${JWT_SECRET:-}" && ${#JWT_SECRET} -lt 32 ]]; then
  echo "invalid: JWT_SECRET must be at least 32 characters" >&2
  missing=1
fi
if [[ "$missing" -ne 0 ]]; then
  echo "Fill the missing secrets, then rerun. Values are never written to git." >&2
  exit 1
fi

python3 - <<PY
import json
from pathlib import Path
import os
path = Path("$ROOT/cloudbaserc.json")
data = json.loads(path.read_text())
env_id = os.environ["CLOUDBASE_ENV_ID"].strip()
if env_id and data.get("envId") != env_id:
    data["envId"] = env_id
    path.write_text(json.dumps(data, indent=2) + "\n")
    print("updated cloudbaserc.json envId")
else:
    print("cloudbaserc.json envId already matches")
PY

if command -v tcb >/dev/null 2>&1 && [[ -n "${TENCENTCLOUD_SECRET_ID:-}" && -n "${TENCENTCLOUD_SECRET_KEY:-}" ]]; then
  echo "tcb CLI found; logging in with API keys (no values printed)"
  tcb login --apiKeyId "$TENCENTCLOUD_SECRET_ID" --apiKey "$TENCENTCLOUD_SECRET_KEY" >/dev/null
  tcb env:list || true
else
  echo "tcb CLI or TENCENTCLOUD_SECRET_ID/KEY not available; skipped remote CloudBase login"
fi

echo "local production variable names look complete"
echo "next: prisma migrate deploy, docker/cloud deploy of littlemo-api, then build-miniapp-prod.sh"
