#!/usr/bin/env bash
# One-time VPS bootstrap — creates /opt/scholarshiptop layout (site only).
# Run as root on Ubuntu/Debian VPS. Does NOT start jobs.
set -euo pipefail

ROOT="${SCHOLARSHIPTOP_ROOT:-/opt/scholarshiptop}"
REPO_URL="${SCHOLARSHIPTOP_REPO:-git@github.com:loomany/scholarshipstop.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCAFFOLD_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== setup-vps root=${ROOT} ==="

apt-get update -qq
apt-get install -y -qq git curl ca-certificates

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

mkdir -p "${ROOT}/"{app,env,logs,backups,nginx/certs,nginx/conf.d,scripts}
chmod 700 "${ROOT}/env"

if [[ ! -d "${ROOT}/app/.git" ]]; then
  git clone --branch "${BRANCH}" "${REPO_URL}" "${ROOT}/app"
else
  echo "app repo already exists — skip clone"
fi

cp -f "${SCAFFOLD_DIR}/docker-compose.yml" "${ROOT}/"
cp -f "${SCAFFOLD_DIR}/Dockerfile" "${ROOT}/"
cp -f "${SCAFFOLD_DIR}/nginx/conf.d/"*.conf "${ROOT}/nginx/conf.d/"

chmod +x "${SCAFFOLD_DIR}/scripts/"*.sh
cp -f "${SCAFFOLD_DIR}/scripts/"*.sh "${ROOT}/scripts/"

touch "${ROOT}/env/.gitkeep"
echo "=== setup-vps done ==="
echo "Next steps:"
echo "  1. ${ROOT}/scripts/pull-site-env-from-railway.sh"
echo "  2. ${ROOT}/scripts/deploy-site.sh"
echo "  3. SMOKE_BASE_URL=http://VPS_IP ${ROOT}/scripts/smoke-site.sh"
