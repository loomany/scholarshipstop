#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$(cd "${SCRIPT_DIR}/.." && pwd)/backup-postgres-daily.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "${TMP_ROOT}"' EXIT

make_fake_tools() {
  local dir="$1"
  mkdir -p "${dir}"

  cat > "${dir}/pg_dump" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
out=''
for arg in "$@"; do
  case "${arg}" in
    --file=*) out="${arg#--file=}" ;;
  esac
done
[[ -n "${out}" ]]
case "${FAKE_DUMP_MODE:-ok}" in
  fail) exit 23 ;;
  empty) : > "${out}" ;;
  invalid) printf 'invalid-dump\n' > "${out}" ;;
  ok) printf 'valid-custom-dump-fixture\n' > "${out}" ;;
  *) exit 24 ;;
esac
SH

  cat > "${dir}/pg_restore" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
file="${*: -1}"
grep -q '^valid-custom-dump-fixture$' "${file}"
SH

  chmod +x "${dir}/pg_dump" "${dir}/pg_restore"
}

run_case() {
  local name="$1"
  local mode="$2"
  local expected="$3"
  local case_dir="${TMP_ROOT}/${name}"
  local tools_dir="${case_dir}/tools"
  local backup_dir="${case_dir}/backups"
  mkdir -p "${backup_dir}"
  make_fake_tools "${tools_dir}"

  set +e
  POSTGRES_ENV_FILE="${case_dir}/missing.env" \
  POSTGRES_DB='test_db' \
  POSTGRES_BACKUP_DIR="${backup_dir}" \
  POSTGRES_BACKUP_RUN_AS='current' \
  PG_DUMP_BIN="${tools_dir}/pg_dump" \
  PG_RESTORE_BIN="${tools_dir}/pg_restore" \
  FAKE_DUMP_MODE="${mode}" \
    bash "${SCRIPT}" > "${case_dir}/stdout" 2> "${case_dir}/stderr"
  local status=$?
  set -e

  if [[ "${expected}" == 'success' ]]; then
    [[ "${status}" -eq 0 ]]
    local dump
    dump="$(find "${backup_dir}" -maxdepth 1 -name 'scholarshiptop_prod-*.dump' -type f | head -n 1)"
    [[ -n "${dump}" && -s "${dump}" ]]
    [[ -s "${dump}.sha256" ]]
    [[ -L "${backup_dir}/latest.dump" || -e "${backup_dir}/latest.dump" ]]
    grep -q '\[pg-backup\] OK' "${case_dir}/stdout"
  else
    [[ "${status}" -ne 0 ]]
    [[ -z "$(find "${backup_dir}" -maxdepth 1 -name 'scholarshiptop_prod-*.dump' -type f -print -quit)" ]]
    [[ -z "$(find "${backup_dir}" -maxdepth 1 -name '*.tmp.*' -type f -print -quit)" ]]
  fi
}

run_case success ok success
run_case pg_dump_failure fail failure
run_case empty_dump empty failure
run_case invalid_dump invalid failure

echo 'backup-postgres-daily tests: PASS'
