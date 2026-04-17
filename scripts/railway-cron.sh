#!/usr/bin/env bash
# Railway / VPS cron: replaces GitHub Actions scheduled jobs.
# Usage:
#   bash scripts/railway-cron.sh all
#   bash scripts/railway-cron.sh seo-url-inspection
#   bash scripts/railway-cron.sh google-indexing-flush
#   bash scripts/railway-cron.sh grant-notifications
#   bash scripts/railway-cron.sh weekly-free-digest   # (optional; not part of default "all")
#   bash scripts/railway-cron.sh enrich-providers
#   bash scripts/railway-cron.sh essay-pipeline
#   bash scripts/railway-cron.sh seo-daily-telegram   # daily digest of new SEO hub pages (Telegram)
#
# Default task "all" = SEO + indexing flush + grants + enrich + essay (same as your checklist).
# Schedule "weekly-free-digest" separately: bash scripts/railway-cron.sh weekly-free-digest
#
# Base URL (first non-empty):
#   PUBLIC_URL, APP_URL, NEXT_PUBLIC_SITE_URL, SITE_URL
#
# HTTP cron calls use Node.js built-in fetch (scripts/railway-cron-post.mjs) — Node 18+;
# no curl required in the container.
#
# Secrets (set in Railway Variables):
#   GOOGLE_INDEXING_SECRET — Bearer for SEO + Google Indexing API routes
#   GRANT_NOTIFICATION_CRON_SECRET — grant notifications + fallback for weekly digest + SEO Telegram digest
#   SEO_DAILY_DIGEST_CRON_SECRET — optional; overrides Bearer for seo-daily-telegram (else GRANT_NOTIFICATION_CRON_SECRET)
#   WEEKLY_FREE_DIGEST_CRON_SECRET — optional; else GRANT_NOTIFICATION_CRON_SECRET is used
#
# Node tasks (enrich-providers, essay-pipeline) need a full Node toolchain in the image
# (npm, tsx via npx). Slim Next.js images may omit them — set RAILWAY_CRON_REQUIRE_NODE=1 to fail
# if npm is missing; otherwise those steps are skipped with a warning.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

resolve_base_url() {
  local u
  u="${PUBLIC_URL:-}"
  u="${u:-${APP_URL:-}}"
  u="${u:-${NEXT_PUBLIC_SITE_URL:-}}"
  u="${u:-${SITE_URL:-}}"
  u="$(echo -n "$u" | sed 's/[[:space:]]//g')"
  u="${u%/}"
  if [ -z "$u" ]; then
    echo "[railway-cron] ERROR: Set PUBLIC_URL or APP_URL (or NEXT_PUBLIC_SITE_URL / SITE_URL)." >&2
    exit 1
  fi
  echo "$u"
}

BASE_URL="$(resolve_base_url)"

# POST JSON via Node fetch (Node 18+). Args: task name, path, bearer, optional JSON body.
http_post_json() {
  local name="$1"
  local path="$2"
  local bearer="$3"
  local data="${4:-{}}"
  local url="${BASE_URL}${path}"

  echo "[railway-cron] Starting task: ${name}"
  echo "[railway-cron] POST ${url}"

  # Temporarily do not exit the whole cron on POST failure (Railway log visibility).
  if node "${SCRIPT_DIR}/railway-cron-post.mjs" "$url" "$bearer" "$data"; then
    echo "[railway-cron] OK: ${name}"
  else
    echo "[railway-cron] Node script failed with exit code $?"
    echo "[railway-cron] WARN: ${name} — continuing (no abort)"
  fi
}

require_env() {
  local n="$1"
  local v="${!n:-}"
  if [ -z "$v" ]; then
    echo "[railway-cron] ERROR: Missing environment variable: ${n}" >&2
    exit 1
  fi
}

task_seo_url_inspection() {
  require_env GOOGLE_INDEXING_SECRET
  http_post_json "SEO check-index-worker (pending)" \
    "/api/internal/seo/check-index-worker" "$GOOGLE_INDEXING_SECRET" "{}"
  http_post_json "SEO scan-indexing (submitted)" \
    "/api/internal/seo/scan-indexing" "$GOOGLE_INDEXING_SECRET" "{}"
}

task_google_indexing_flush() {
  require_env GOOGLE_INDEXING_SECRET
  http_post_json "Daily Google Indexing flush" \
    "/api/internal/google-indexing" "$GOOGLE_INDEXING_SECRET" \
    '{"action":"flush","limit":200}'
}

task_grant_notifications() {
  require_env GRANT_NOTIFICATION_CRON_SECRET
  http_post_json "Grant notification dispatch" \
    "/api/internal/grant-notifications/run" "$GRANT_NOTIFICATION_CRON_SECRET" "{}"
}

task_seo_daily_telegram() {
  local secret="${SEO_DAILY_DIGEST_CRON_SECRET:-${GRANT_NOTIFICATION_CRON_SECRET:-}}"
  if [ -z "$secret" ]; then
    echo "[railway-cron] ERROR: Set SEO_DAILY_DIGEST_CRON_SECRET or GRANT_NOTIFICATION_CRON_SECRET" >&2
    exit 1
  fi
  http_post_json "SEO hub daily Telegram digest" \
    "/api/internal/seo/daily-digest-telegram" "$secret" "{}"
}

task_weekly_free_digest() {
  local secret="${WEEKLY_FREE_DIGEST_CRON_SECRET:-${GRANT_NOTIFICATION_CRON_SECRET:-}}"
  if [ -z "$secret" ]; then
    echo "[railway-cron] ERROR: Set WEEKLY_FREE_DIGEST_CRON_SECRET or GRANT_NOTIFICATION_CRON_SECRET" >&2
    exit 1
  fi
  http_post_json "Weekly free digest" \
    "/api/internal/weekly-free-digest/run" "$secret" "{}"
}

require_npm_or_exit() {
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi
  if [ -n "${RAILWAY_CRON_REQUIRE_NODE:-}" ]; then
    echo "[railway-cron] ERROR: npm not found; install Node toolchain or use a worker image with devDependencies." >&2
    exit 1
  fi
  echo "[railway-cron] WARN: npm not found — skipping local Node script (enrich / essay). Deploy a worker with Node+repo or run these from a dev machine." >&2
  return 1
}

task_enrich_providers() {
  echo "[railway-cron] Starting task: enrich-providers (local npm script)"
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$BASE_URL}"
  require_env NEXT_PUBLIC_SUPABASE_URL
  require_env SUPABASE_SERVICE_ROLE_KEY
  require_env OPENAI_API_KEY
  require_env PROVIDERS_REVALIDATE_SECRET
  require_npm_or_exit || return 0
  (cd "$PROJECT_ROOT" && npm run enrich-providers)
  echo "[railway-cron] OK: enrich-providers"
}

task_essay_pipeline() {
  echo "[railway-cron] Starting task: essay-pipeline (local npm/tsx)"
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$BASE_URL}"
  require_env NEXT_PUBLIC_SUPABASE_URL
  require_env SUPABASE_SERVICE_ROLE_KEY
  require_env OPENAI_API_KEY
  require_env FAL_KEY
  require_npm_or_exit || return 0
  export ESSAY_HUB_HERO_FAL_BACKEND="${ESSAY_HUB_HERO_FAL_BACKEND:-flux}"
  (cd "$PROJECT_ROOT" && npx tsx scripts/run-essay-pipeline-full.ts)
  echo "[railway-cron] OK: essay-pipeline"
}

task_all() {
  task_seo_url_inspection
  task_google_indexing_flush
  task_grant_notifications
  task_enrich_providers
  task_essay_pipeline
}

usage() {
  echo "Usage: $0 <task>"
  echo "Tasks: all | seo-url-inspection | google-indexing-flush | grant-notifications | seo-daily-telegram | weekly-free-digest | enrich-providers | essay-pipeline"
}

main() {
  local cmd="${1:-all}"
  case "$cmd" in
    all) task_all ;;
    seo-url-inspection) task_seo_url_inspection ;;
    google-indexing-flush) task_google_indexing_flush ;;
    grant-notifications) task_grant_notifications ;;
    seo-daily-telegram) task_seo_daily_telegram ;;
    weekly-free-digest) task_weekly_free_digest ;;
    enrich-providers) task_enrich_providers ;;
    essay-pipeline) task_essay_pipeline ;;
    -h|--help|help) usage; exit 0 ;;
    *)
      echo "[railway-cron] Unknown task: $cmd" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
