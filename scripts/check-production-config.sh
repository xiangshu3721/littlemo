#!/usr/bin/env bash
# Validate production variables without printing their values.
set -euo pipefail

missing=0

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing: $name" >&2
    missing=1
  fi
}

require_value CLOUDBASE_ENV_ID
require_value CLOUDBASE_SERVICE_NAME
require_value DATABASE_URL
require_value JWT_SECRET
require_value DEEPSEEK_API_KEY

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
