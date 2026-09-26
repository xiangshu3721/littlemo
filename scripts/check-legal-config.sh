#!/usr/bin/env bash
# Validate the public legal/AI disclosures required before a production release.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}
load_env_file "$ROOT/.env.production"
load_env_file "$ROOT/apps/miniapp/.env.production"

missing=0

require_public_value() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "missing: $name" >&2
    missing=1
    return
  fi
  case "$value" in
    *待填写*|*待确认*|*待补充*|*未确认*|*未知*|*YOUR_*|*your_*|*TODO*|*todo*|*placeholder*)
      echo "invalid: $name still contains a placeholder" >&2
      missing=1
      ;;
  esac
}

for name in \
  LEGAL_OPERATOR_NAME \
  LEGAL_PRIVACY_CONTACT \
  LEGAL_COMPLAINT_CONTACT \
  LEGAL_COMPLAINT_RESPONSE_TIME \
  LEGAL_AGE_SCOPE \
  LEGAL_STORAGE_REGION \
  LEGAL_RETENTION_DESCRIPTION \
  MINIPROGRAM_FILING_NO \
  DEEPSEEK_MODEL \
  DEEPSEEK_SERVICE_FILING_NO \
  DEEPSEEK_ALGORITHM_FILING_NO \
  DEEPSEEK_DATA_HANDLING \
  DEEPSEEK_DATA_REGION; do
  require_public_value "$name"
done

if [[ -n "${LEGAL_AGE_SCOPE:-}" && "$LEGAL_AGE_SCOPE" != "仅限年满18周岁" ]]; then
  echo "invalid: this build has no minor mode or guardian workflow; confirm an adult-only scope or implement minor protections first" >&2
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "public legal and AI disclosures look complete; values were not printed"
