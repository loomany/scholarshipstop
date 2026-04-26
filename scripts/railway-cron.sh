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
#   bash scripts/railway-cron.sh manual-essay-guides
#   Optional: MANUAL_ESSAY_GUIDES_LIMIT=5 caps how many queue items to process; unset = drain all pending
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
# SEO URL Inspection + Google Indexing queue flush run as local `npx tsx scripts/cron-*.ts`
# (avoids Cloudflare 524 on long HTTP /api/internal/seo/*). Requires same env as the app
# (Supabase service role, Google credentials). Indexing queue lives in public.google_indexing_queue.
#
# Secrets (set in Railway Variables):
#   GOOGLE_INDEXING_SECRET — Bearer for SEO + Google Indexing API routes
#   GRANT_NOTIFICATION_CRON_SECRET — fallback Bearer for weekly digest + SEO Telegram digest
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

# Run a TypeScript cron script from repo root; logs full stdout/stderr to Railway.
run_tsx_cron() {
  local name="$1"
  local rel="$2"
  echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') tsx START ${name} (${rel})"
  set +e
  (cd "$PROJECT_ROOT" && npx tsx "$rel")
  local ec=$?
  set -e
  if [ "$ec" -eq 0 ]; then
    echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') tsx OK ${name}"
  else
    echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') tsx WARN ${name} exit=${ec} (continuing)"
  fi
}

# POST JSON via Node fetch (Node 18+). Args: task name, path, bearer, optional JSON body.
http_post_json() {
  local name="$1"
  local path="$2"
  local bearer="$3"
  local data="${4:-{}}"
  local url="${BASE_URL}${path}"

  echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') Starting task: ${name}"
  echo "[railway-cron] POST ${url}"

  # Do not exit the whole cron on POST failure (Railway log visibility).
  set +e
  node "${SCRIPT_DIR}/railway-cron-post.mjs" "$url" "$bearer" "$data"
  http_ec=$?
  set -e
  if [ "$http_ec" -eq 0 ]; then
    echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') Finished OK: ${name}"
  else
    echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') WARN: ${name} — exit ${http_ec} (continuing)"
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
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$BASE_URL}"
  require_env NEXT_PUBLIC_SUPABASE_URL
  require_env SUPABASE_SERVICE_ROLE_KEY
  require_npm_or_exit || return 0
  run_tsx_cron "cron-check-index-worker" "scripts/cron-check-index-worker.ts"
  run_tsx_cron "cron-scan-indexing" "scripts/cron-scan-indexing.ts"
}

task_google_indexing_flush() {
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$BASE_URL}"
  require_env GOOGLE_INDEXING_CLIENT_EMAIL
  require_env GOOGLE_INDEXING_PRIVATE_KEY
  require_npm_or_exit || return 0
  export GOOGLE_INDEXING_FLUSH_LIMIT="${GOOGLE_INDEXING_FLUSH_LIMIT:-100}"
  run_tsx_cron "cron-google-indexing-flush" "scripts/cron-google-indexing-flush.ts"
}

task_grant_notifications() {
  echo "[railway-cron] Starting task: grant-notifications (local tsx)"
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$BASE_URL}"
  require_env NEXT_PUBLIC_SUPABASE_URL
  require_env SUPABASE_SERVICE_ROLE_KEY
  require_env RESEND_API_KEY
  require_npm_or_exit || return 0
  run_tsx_cron "cron-grant-notifications" "scripts/cron-grant-notifications.ts"
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

task_manual_essay_guides() {
  echo "[railway-cron] Starting task: manual-essay-guides (local npm/tsx)"
  export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$BASE_URL}"
  require_env NEXT_PUBLIC_SUPABASE_URL
  require_env SUPABASE_SERVICE_ROLE_KEY
  require_env OPENAI_API_KEY
  require_npm_or_exit || return 0
  (cd "$PROJECT_ROOT" && npx tsx scripts/enqueue-manual-essay-guides.ts)
  if [ -n "${MANUAL_ESSAY_GUIDES_LIMIT:-}" ] && [ "${MANUAL_ESSAY_GUIDES_LIMIT}" -gt 0 ] 2>/dev/null; then
    (cd "$PROJECT_ROOT" && npx tsx scripts/run-manual-essay-guides.ts --limit="${MANUAL_ESSAY_GUIDES_LIMIT}")
  else
    (cd "$PROJECT_ROOT" && npx tsx scripts/run-manual-essay-guides.ts --until-empty)
  fi
  (cd "$PROJECT_ROOT" && npx tsx scripts/audit-manual-essay-guides.ts)
  echo "[railway-cron] OK: manual-essay-guides"
}

task_all() {
  # Google indexing/inspection moved to a dedicated worker container.
  # Keep `all` focused on non-indexing workloads for this service.
  task_enrich_providers
  task_essay_pipeline
  task_manual_essay_guides
}

usage() {
  echo "Usage: $0 <task>"
  echo "Tasks: all | seo-url-inspection | google-indexing-flush | grant-notifications | seo-daily-telegram | weekly-free-digest | enrich-providers | essay-pipeline | manual-essay-guides"
}

main() {
  echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') run start task=${1:-all} base=${BASE_URL}"
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
    manual-essay-guides) task_manual_essay_guides ;;
    -h|--help|help) usage; exit 0 ;;
    *)
      echo "[railway-cron] Unknown task: $cmd" >&2
      usage >&2
      exit 1
      ;;
  esac
  echo "[railway-cron] $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo '') run end task=${1:-all}"
}

main "$@"
