#!/usr/bin/env bash
# Validate production variables without printing their values.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$ROOT/.env.production" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.production"
  set +a
fi

missing=0

# These public identifiers are already known for this project; avoid making
# the operator copy values that are fixed in cloudbaserc.json and build config.
CLOUDBASE_ENV_ID="${CLOUDBASE_ENV_ID:-littlemo-d2gy2ec0dd102163}"
CLOUDBASE_SERVICE_NAME="${CLOUDBASE_SERVICE_NAME:-littlemo-api}"
export CLOUDBASE_ENV_ID CLOUDBASE_SERVICE_NAME

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing: $name" >&2
    missing=1
  fi
}

require_value CLOUDBASE_ENV_ID
require_value CLOUDBASE_SERVICE_NAME
require_value CLOUDBASE_APIKEY
require_value JWT_SECRET
require_value DEEPSEEK_API_KEY

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "obsolete: remove DATABASE_URL; production uses the CloudBase PostgreSQL SDK" >&2
  missing=1
fi

bash "$SCRIPT_DIR/check-legal-config.sh"

if [[ "${CLOUDBASE_SERVICE_NAME:-}" != "littlemo-api" ]]; then
  echo "invalid: CLOUDBASE_SERVICE_NAME must be littlemo-api" >&2
  missing=1
fi
if [[ -n "${API_BASE_URL:-}" ]]; then
  echo "invalid: API_BASE_URL must be unset for the production mini-program" >&2
  missing=1
fi
if [[ -n "${JWT_SECRET:-}" && ${#JWT_SECRET} -lt 32 ]]; then
  echo "invalid: JWT_SECRET must be at least 32 characters" >&2
  missing=1
fi
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "production configuration looks complete; secret values were not printed"
