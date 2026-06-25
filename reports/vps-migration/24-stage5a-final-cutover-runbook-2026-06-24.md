# Stage 5A — Final Supabase to VPS cutover runbook and dry rehearsal plan

**Дата:** 2026-06-24
**Scope:** безопасный runbook реального cutover Supabase → VPS self-host API/DB.
**Execution status:** real cutover **not run**.

## Verdict: **STAGE_5A_RUNBOOK_READY**

Stage 4F.1 is the readiness baseline:

| Dependency | Status |
|------------|--------|
| Production-like frontend against VPS self-host API | **PASS** |
| SSR auth: signUp/signIn/getUser/profile/signOut | **PASS** |
| Playwright UI sign-in | **PASS** |
| `refreshSession` | **PASS** |
| GoTrue/PostgREST/RLS/RPC smokes | **PASS** |
| Production site/env/parsers/hosted Supabase | **unchanged** |

---

## Hard constraints

During Stage 5A no production state was changed:

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| Production `site.env` not changed | **PASS** |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No real cutover / no dual-write | **PASS** |
| No secrets/tokens/passwords/URIs printed or committed | **PASS** |

---

## Estimated timing

| Phase | Estimate | Notes |
|-------|----------|-------|
| Prechecks before window | 15-30 min | Can run before freeze |
| Write freeze + final dump | 15-30 min | Depends on hosted DB size/network |
| Restore + validation | 20-45 min | Use tmux/screen; validate before switch |
| Site switch + rebuild/restart | 10-20 min | Production site downtime risk starts here |
| Site/auth validation | 10-15 min | Must pass before parsers |
| Parser one-shot validation | 10-30 min | One parser only |
| Rollback | 10-20 min | If env backups are ready |

**Expected user-facing downtime:** 10-30 minutes if maintenance page/read-only mode is used during site rebuild and auth smoke.
**Maximum planned freeze window:** 90 minutes. Abort and rollback if production is not healthy by T+45 min after site switch.

---

## Owner approval checklist

Do not start real cutover until all are signed off:

| Approval | Owner | Required |
|----------|-------|----------|
| Maintenance/freeze window approved | Business owner | **YES** |
| Rollback owner online | Engineer/operator | **YES** |
| Hosted Supabase retained >= 7 days | Business/engineering | **YES** |
| Parser freeze approved | Data/content owner | **YES** |
| Email/auth risk accepted | Product owner | **YES** |
| DNS/API public route plan approved | Engineering | **YES** |

Dry-run script requires:

```bash
STAGE5A_OWNER_APPROVED=YES
STAGE5A_FREEZE_WINDOW_APPROVED=YES
STAGE5A_ROLLBACK_OWNER_READY=YES
STAGE5A_HOSTED_SUPABASE_RETENTION_APPROVED=YES
bash scripts/vps-migration/stage5a-cutover-dry-run.sh
```

The script remains dry-run by default and must not be used for real cutover execution.

---

## 1. Pre-cutover checklist

Run on VPS:

```bash
bash /opt/scholarshiptop/app/scripts/vps-migration/stage5a-precutover-check.sh
```

Checklist details:

| Check | Expected |
|-------|----------|
| `git status` / recent commits | Known commit, no surprise untracked env/secrets |
| VPS RAM/disk/swap | >= 1 GiB available before build, disk >= 20 GiB free, swap preferred |
| Production smoke | `https://scholarshiptop.com/` 200, `/sitemap.xml` 200 |
| Production env | `NEXT_PUBLIC_SUPABASE_URL` still hosted `*.supabase.co` |
| Self-host API | `/health` 200, `/auth/v1/health` 200 |
| Docker | production site, nginx, GoTrue, PostgREST, gateway running |
| Parser schedules | inventory active cron/systemd timers before freeze |
| Backups folders | `${ROOT}/backups`, `/opt/scholarshiptop-db-backups` exist |
| Long-running shell | tmux or screen installed |
| Production logs | no shadow API references |

Pre-window commands:

```bash
tmux new -s supabase-cutover-precheck
free -h
uptime
df -h / /opt
sudo docker ps
git -C /opt/scholarshiptop/app status --short
git -C /opt/scholarshiptop/app log --oneline -5
```

Do **not** print direct DB URLs or JWTs.

---

## 2. Write freeze

Goal: final hosted Supabase dump must be a single source-of-truth snapshot. No dual-write.

Freeze steps:

```bash
tmux new -s supabase-cutover
sudo mkdir -p /opt/scholarshiptop/backups /opt/scholarshiptop-db-backups
sudo crontab -l > /opt/scholarshiptop/backups/root-crontab-pre-cutover.txt 2>/dev/null || true
crontab -l > /opt/scholarshiptop/backups/user-crontab-pre-cutover.txt 2>/dev/null || true
systemctl list-timers --all --no-pager > /opt/scholarshiptop/backups/systemd-timers-pre-cutover.txt
systemctl list-units --type=service --all --no-pager > /opt/scholarshiptop/backups/systemd-services-pre-cutover.txt
```

Pause all writers:

```bash
# Replace with exact service/timer names from precheck output.
sudo systemctl stop '<parser timers>'
sudo systemctl stop '<parser services>'
sudo systemctl stop '<content-hub/seo/mailing/translation timers>'
sudo systemctl stop '<content-hub/seo/mailing/translation services>'
```

Confirm no writers:

```bash
systemctl list-timers --all --no-pager | grep -Ei 'parser|seo|mailing|content|translation' || true
sudo docker ps --format '{{.Names}}' | grep -Ei 'scripts|seo|mailing|content|translation' || true
```

Site options during freeze:

| Option | Recommendation |
|--------|----------------|
| Short maintenance window | **Preferred** for final dump + restore |
| Read-only site | Acceptable if all write paths are blocked |
| Keep fully writable | **Do not use**; risks lost writes or dual-write |

---

## 3. Final fresh dump and restore

Use tmux/screen. The direct hosted Supabase URI must come from a root-only file/env and never be printed.

```bash
tmux attach -t supabase-cutover
SUPABASE_DB_URL_FILE=/root/.supabase-db-url \
SUPABASE_DUMP_DIR=/opt/scholarshiptop-db-backups \
bash /opt/scholarshiptop/app/scripts/vps-migration/export-supabase-prod-dump.sh
```

Validate dump:

```bash
ls -lh /opt/scholarshiptop-db-backups/supabase-prod-*.dump
sha256sum -c /opt/scholarshiptop-db-backups/supabase-prod-<timestamp>.dump.sha256
```

Restore/validate:

```bash
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/restore-postgres-clean-test.sh \
  /opt/scholarshiptop-db-backups/supabase-prod-<timestamp>.dump

sudo bash /opt/scholarshiptop/app/ops/vps/scripts/restore-postgres-superuser.sh \
  /opt/scholarshiptop-db-backups/supabase-prod-<timestamp>.dump

sudo bash /opt/scholarshiptop/app/ops/vps/scripts/validate-vps-db-restore-extended.sh
```

Required validation:

| Area | Required |
|------|----------|
| Counts | key table counts match hosted snapshot |
| Sequences | no sequence behind max(id) |
| RLS | anon/authenticated/service-role smokes pass |
| Functions/RPC | critical RPC functions callable |
| Auth | users/identities/sessions present; signIn/refresh smoke pass |
| Extensions | `pg_net`, storage/auth dependencies accounted for |

---

## 4. Self-host API production mode

Current Stage 4F.1 stack is localhost shadow. Production route must be explicit and reviewed.

Required API state before site switch:

| Component | Required |
|-----------|----------|
| GoTrue | `supabase/gotrue:v2.184.0`, `command: ["gotrue", "serve"]` |
| PostgREST | running against restored VPS DB |
| Gateway/nginx | public production API route without Basic Auth |
| CORS | allow `https://scholarshiptop.com` and `https://www.scholarshiptop.com` |
| Bearer auth | no HTTP Basic Auth on `/auth/v1` or `/rest/v1` production API |
| Storage | hybrid/read-only hosted storage documented |
| Health | `/health`, `/auth/v1/health`, representative `/rest/v1` pass |

Prepare shadow/API config:

```bash
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/patch-shadow-rehearsal-auth-compat.sh
sudo docker compose -f /opt/scholarshiptop/app/ops/vps/docker-compose.supabase-api.example.yml \
  --profile supabase-api-test up -d
```

Production public route must be added only inside approved maintenance window. Do not reuse the old Basic Auth shadow route as the primary frontend API.

---

## 5. Site switch

Back up production env:

```bash
TS="$(date -u +%Y%m%dT%H%M%SZ)"
sudo cp /opt/scholarshiptop/env/site.env "/opt/scholarshiptop/backups/site.env.pre-cutover.${TS}"
sudo chmod 600 "/opt/scholarshiptop/backups/site.env.pre-cutover.${TS}"
```

Create new `site.env` manually from the approved staging template:

| Key | Target |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | VPS self-host production API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | legacy anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | legacy service_role JWT |
| Storage keys | unchanged hosted/hybrid |

Do not paste secrets into shell history. Prefer root-only env files and `install -m 600`.

Switch atomically:

```bash
sudo install -m 600 /opt/scholarshiptop/env/site.env.next-cutover /opt/scholarshiptop/env/site.env
```

Rebuild/restart site only:

```bash
sudo bash /opt/scholarshiptop/app/scripts/vps-migration/host-build-site.sh
SMOKE_BASE_URL=http://127.0.0.1 sudo bash /opt/scholarshiptop/app/ops/vps/scripts/smoke-site.sh
```

Required site smoke:

| Route/flow | Required |
|------------|----------|
| `/` | 200 |
| `/sitemap.xml` | 200 |
| `/scholarships` | 200 |
| Scholarship detail | 200 |
| `/signin/password_signin` | 200 |
| signUp/signIn/getUser | pass |
| `/account` | 200 after login |
| profile upsert | pass |
| logout/refreshSession | pass |

---

## 6. Parser switch

Only after site/auth PASS.

Sequence:

```bash
# Backup parser envs first.
sudo cp '<parser env path>' "/opt/scholarshiptop/backups/parser-env.pre-cutover.${TS}"

# Update parser env to one target only: VPS DB/API. No dual-write.
sudo install -m 600 '<prepared parser VPS env>' '<parser env path>'

# Run one parser test only.
sudo systemctl start '<single parser test service>'
```

Validation:

| Check | Required |
|-------|----------|
| Parser writes to VPS only | pass |
| New/updated row visible via site/API | pass |
| Hosted Supabase row count unchanged after freeze | pass |
| Parser logs | no hosted Supabase URL/API writes |

Only then re-enable approved schedules:

```bash
sudo systemctl start '<approved parser timers>'
sudo systemctl start '<approved content/seo timers>'
```

---

## 7. Full validation checklist

| Area | Checks |
|------|--------|
| Pages | homepage, sitemap, listing pages, scholarship detail, compare, SEO hub |
| Auth | signin, signup, `auth.getUser`, refreshSession, account, profile upsert, logout |
| Parser | one write/read path, queues, logs |
| API | GoTrue health, PostgREST health, RLS smoke, service-role smoke |
| Logs | site, nginx, GoTrue, PostgREST, gateway, parser logs |
| Resources | `free -h`, `uptime`, `df -h`, Docker health |
| Hosted Supabase | retained and no new parser writes after freeze |

Monitor for 30-60 minutes before declaring cutover complete.

---

## 8. Rollback

Rollback trigger examples:

- Production homepage/auth fails after 10 minutes.
- refreshSession or profile upsert fails in production.
- Parser writes fail or write to wrong target.
- VPS RAM available < 500 MiB with sustained high load.
- Any secret/env exposure incident.

Rollback commands:

```bash
# 1. Restore hosted Supabase site env.
sudo cp /opt/scholarshiptop/backups/site.env.pre-cutover.<timestamp> /opt/scholarshiptop/env/site.env
sudo chmod 600 /opt/scholarshiptop/env/site.env

# 2. Rebuild/restart production site on hosted Supabase.
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/deploy-site.sh
SMOKE_BASE_URL=http://127.0.0.1 sudo bash /opt/scholarshiptop/app/ops/vps/scripts/smoke-site.sh

# 3. Restore parser env/schedules to hosted Supabase target.
sudo cp /opt/scholarshiptop/backups/parser-env.pre-cutover.<timestamp> '<parser env path>'
sudo systemctl restart '<parser timers/services that were active before freeze>'

# 4. Keep failed VPS DB snapshot for forensic diff.
# Do not delete hosted Supabase for at least 7 days.
```

**Rollback time estimate:** 10-20 minutes if backups are present and Docker build cache is warm.

---

## 9. Risk list

| Risk | Mitigation |
|------|------------|
| Storage hybrid/read-only | Keep hosted storage; do not switch blobs in cutover |
| `pg_net` / `supabase_functions` triggers | Inventory triggers before dump; disable or replace only with approval |
| Email/magic link/OAuth | Password auth tested; magic link/OAuth need production callback validation |
| VPS RAM 3.8 GiB | Build spike observed; swap or >=4 GiB RAM strongly recommended |
| JWT secret exposure | Root-only files, no shell echo, rotate if exposure suspected |
| Public API without Basic Auth | Limit to required `/auth/v1` + `/rest/v1`, CORS to production domains |
| Parser accidental dual-write | Freeze hosted writers first; switch one parser only after site PASS |
| Hosted Supabase deletion | Retain >=7 days; rollback source of truth |

---

## What still blocks real cutover

| Blocker | Status |
|---------|--------|
| Owner approval / freeze window | **Required** |
| Exact parser systemd/cron service names frozen in runbook | **Required from precheck output** |
| Final hosted Supabase dump during freeze | **Not run** |
| Public production API route without Basic Auth | **Must be created in window** |
| Production magic link/OAuth callbacks | **Risk accepted or tested** |
| VPS RAM/swap decision | **Recommend swap or larger VPS before window** |

---

## Deliverables

| Path | Purpose |
|------|---------|
| `scripts/vps-migration/stage5a-precutover-check.sh` | Read-only pre-cutover checker |
| `scripts/vps-migration/stage5a-cutover-dry-run.sh` | Approval-gated dry-run command plan |
| `reports/vps-migration/24-stage5a-final-cutover-runbook-2026-06-24.md` | Final cutover runbook |

---

## Final approval checklist

- [ ] Stage 5A precheck `PASS` or accepted warnings only.
- [ ] Freeze window approved and announced.
- [ ] Rollback owner online.
- [ ] Hosted Supabase retained >= 7 days.
- [ ] Parser services/timers identified and stoppable.
- [ ] Fresh dump command tested in tmux/screen.
- [ ] API production route reviewed (no Basic Auth conflict).
- [ ] `site.env` backup created and restorable.
- [ ] Parser env backup created and restorable.
- [ ] Post-cutover smoke owner assigned.
- [ ] Rollback decision deadline agreed (T+45 min recommended).

---

## Commit hash

`21627e4` — `docs(vps): add Stage 5A final cutover runbook`
