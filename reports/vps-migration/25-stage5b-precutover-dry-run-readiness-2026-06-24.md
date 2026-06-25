# Stage 5B — Pre-cutover dry run readiness check

**Дата:** 2026-06-24
**VPS:** `213.155.22.74`
**Scope:** проверить готовность к реальному cutover по Stage 5A runbook. Real cutover **не выполнялся**.

## Verdict: **PASS_WITH_WARNINGS**

Operational infrastructure готова (swap, disk, RAM, backups, tmux, parser inventory, production health). Real cutover остаётся заблокирован на: public no-basic-auth API route, owner approvals, magic link/OAuth validation.

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Real cutover not executed | **PASS** |
| Production `site.env` not changed | **PASS** |
| Production container not restarted for switch | **PASS** |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No dual-write | **PASS** |
| No secrets/tokens/URIs printed or committed | **PASS** |

---

## 1. Pre-cutover check result

`stage5a-precutover-check.sh` → **STAGE_5A_PRECUTOVER_CHECK_PASS_WITH_WARNINGS (1)**

| Check | Result |
|-------|--------|
| VPS RAM/disk/swap | **PASS** (swap 4 GiB configured) |
| Production smoke `/` `/sitemap.xml` | **PASS** (200/200) |
| Production env hosted Supabase | **PASS** |
| Self-host API health | **PASS** (`/health`, `/auth/v1/health`, `/rest/v1/` all 200) |
| Docker (site/nginx/gotrue/postgrest/gateway) | **PASS** (GoTrue v2.184.0, site healthy) |
| Backups dirs + tmux/screen | **PASS** |
| Env key presence (redacted) | **PASS** |
| Production logs clean of shadow API | **PASS** |
| Single WARN | `/opt/scholarshiptop/app` is a deployed snapshot, **not a git checkout** |

**WARN detail:** Production app is deployed as a snapshot (no `.git`). Cutover steps must not rely on `git pull` inside `/opt/scholarshiptop/app`; use `host-build-site.sh` against the existing tree.

---

## 2. Exact parser services/timers to stop/start

**No cron timers.** Parsers run as long-running systemd **repeater services**.

**Active writers (stop these to freeze):**

```bash
sudo systemctl stop scholarshiptop-parser-bigfuture.service
sudo systemctl stop scholarshiptop-parser-scholarship-america.service
sudo systemctl stop scholarshiptop-parser-simpler-grants-gov.service
```

`Restart=always` → also disable during freeze to prevent auto-restart, re-enable after:

```bash
sudo systemctl disable scholarshiptop-parser-bigfuture.service \
  scholarshiptop-parser-scholarship-america.service \
  scholarshiptop-parser-simpler-grants-gov.service
```

**Start/restore after parser validation:**

```bash
sudo systemctl enable --now scholarshiptop-parser-bigfuture.service \
  scholarshiptop-parser-scholarship-america.service \
  scholarshiptop-parser-simpler-grants-gov.service
```

**Parser facts:**

| Item | Value |
|------|-------|
| Base | `/opt/scholarshiptop-parsers/` |
| App | `/opt/scholarshiptop-parsers/app` (`repeater.py`) |
| Repeater | `/opt/scholarshiptop-parsers/scripts/run-parser-repeater.sh <slug>` |
| Env (per slug) | `/opt/scholarshiptop-parsers/env/<slug>.env` (mode 600, root only) |
| Active parsers | bigfuture, scholarship-america, simpler-grants-gov |
| Env-only (no active service) | daad, iefa, mina7portal, opportunitydesk, scholars4dev, scholarships360, wemakescholars |
| Write target | all `SUPABASE_URL` → **hosted `*.supabase.co`** (service_role key) |

**Parser switch (in window, after site PASS, one at a time):** edit `SUPABASE_URL` in each active `<slug>.env` from hosted to VPS self-host API; keep legacy service_role JWT. No dual-write.

---

## 3. Swap / RAM status

| Metric | Value | Verdict |
|--------|-------|---------|
| RAM total | 3.8 GiB | OK with swap |
| RAM available (idle) | ~1.1 GiB | OK idle; build spikes need swap |
| Swap | **4.0 GiB** (`/swapfile`) | **already configured — no change needed** |
| Load avg | 0.38 / 0.30 / 0.28 | healthy |

Stage 5A recommendation (add swap) is **already satisfied** — `/swapfile` 4 GiB present. No swap changes made in Stage 5B.

---

## 4. Disk status

| Metric | Value | Verdict |
|--------|-------|---------|
| `/` size | 79 GiB | OK |
| Used | 20 GiB (26%) | OK |
| Available | **57 GiB** | OK for dump + restore |
| Inodes used | 6% | OK |

Sufficient headroom for final dump + restore + container rebuild.

---

## 5. tmux / screen for final dump

- `tmux` installed, `screen` installed.
- No stale sessions open.
- Final dump **must** run inside tmux/screen (long-running). Dump script reads URI from root-only file/env, never prints it.

---

## 6. Public production API nginx route (checked, NOT enabled)

**Current state:** only the **basic-auth shadow route** exists:

```
location ~ ^/vps-shadow-supabase-4c/rest/v1/ { auth_basic ...; proxy_pass gateway:8080; }
location /vps-shadow-supabase-4c/          { auth_basic ...; proxy_pass gateway:8080; }
```

**Gap:** there is **no public production API route without Basic Auth**. The browser Supabase client needs `Authorization: Bearer` and cannot share the header with HTTP Basic Auth (documented in Stage 4C/4F).

**Required before real cutover (create in window, do NOT enable now):**
- A public route (path or `api.` subdomain) for `/auth/v1` + `/rest/v1` **without** Basic Auth.
- CORS allowing `https://scholarshiptop.com` and `https://www.scholarshiptop.com`.
- Reference config in repo: `ops/vps/nginx/includes/scholarshiptop-supabase-api-locations.example.conf`.

Production site conf currently includes `scholarshiptop-proxy-locations.conf` with `location ~ ^/(api|admin|account|auth)/` → reverse-proxies the **Next.js** app `/auth/` (auth callbacks), distinct from Supabase `/auth/v1`. A new dedicated prefix/subdomain is required for the Supabase API.

**Not changed in Stage 5B.**

---

## 7. Backup of site.env + rollback

Existing backups in `/opt/scholarshiptop/backups/`: `site.env.pre-ssl-*` (3 files).

Cutover must create a dedicated pre-cutover backup:

```bash
TS="$(date -u +%Y%m%dT%H%M%SZ)"
sudo cp /opt/scholarshiptop/env/site.env "/opt/scholarshiptop/backups/site.env.pre-cutover.${TS}"
sudo chmod 600 "/opt/scholarshiptop/backups/site.env.pre-cutover.${TS}"
```

Rollback restores from that file (see section below). Backups dir is writable, root-owned, mode 600.

---

## 8. Exact command set (for the real window — not executed here)

**Final dump (in tmux):**

```bash
tmux new -s supabase-cutover
SUPABASE_DB_URL_FILE=/root/.supabase-db-url \
SUPABASE_DUMP_DIR=/opt/scholarshiptop-db-backups \
bash /opt/scholarshiptop/app/scripts/vps-migration/export-supabase-prod-dump.sh
sha256sum -c /opt/scholarshiptop-db-backups/supabase-prod-<timestamp>.dump.sha256
```

**Restore:**

```bash
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/restore-postgres-clean-test.sh \
  /opt/scholarshiptop-db-backups/supabase-prod-<timestamp>.dump
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/restore-postgres-superuser.sh \
  /opt/scholarshiptop-db-backups/supabase-prod-<timestamp>.dump
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/validate-vps-db-restore-extended.sh
```

**Site switch:**

```bash
sudo install -m 600 /opt/scholarshiptop/env/site.env.next-cutover /opt/scholarshiptop/env/site.env
sudo bash /opt/scholarshiptop/app/scripts/vps-migration/host-build-site.sh
SMOKE_BASE_URL=http://127.0.0.1 sudo bash /opt/scholarshiptop/app/ops/vps/scripts/smoke-site.sh
```

**Parser switch (after site PASS, one at a time):**

```bash
sudo cp /opt/scholarshiptop-parsers/env/bigfuture.env \
  "/opt/scholarshiptop/backups/bigfuture.env.pre-cutover.${TS}"
# edit SUPABASE_URL -> VPS self-host API in /opt/scholarshiptop-parsers/env/bigfuture.env (root, 600)
sudo systemctl enable --now scholarshiptop-parser-bigfuture.service
# validate VPS writes only, then repeat for scholarship-america, simpler-grants-gov
```

**Rollback:**

```bash
sudo cp /opt/scholarshiptop/backups/site.env.pre-cutover.<timestamp> /opt/scholarshiptop/env/site.env
sudo chmod 600 /opt/scholarshiptop/env/site.env
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/deploy-site.sh
sudo cp /opt/scholarshiptop/backups/<slug>.env.pre-cutover.<timestamp> /opt/scholarshiptop-parsers/env/<slug>.env
sudo systemctl restart scholarshiptop-parser-bigfuture.service \
  scholarshiptop-parser-scholarship-america.service \
  scholarshiptop-parser-simpler-grants-gov.service
# Keep VPS DB snapshot; do not delete hosted Supabase for >=7 days.
```

**Rollback time estimate:** 10-20 minutes.

---

## 9. Remaining risks / blockers for real cutover

| Item | Status |
|------|--------|
| Public no-basic-auth production API route | **BLOCKER** — must be created in window |
| Owner / freeze-window / rollback approvals | **Required** |
| Magic link / OAuth production callbacks | **Risk — not fully production-tested** |
| Storage hybrid/read-only | Keep hosted; no blob switch |
| `pg_net` / `supabase_functions` triggers | Inventory before dump |
| JWT secret exposure | Root-only files; rotate if exposed |
| App dir is snapshot (no git) | Use `host-build-site.sh`, not `git pull` |
| RAM 3.8 GiB | Mitigated by 4 GiB swap (already configured) |

---

## Final approval checklist

- [ ] Stage 5B readiness reviewed (this report).
- [ ] Public production Supabase API route (no Basic Auth) prepared + reviewed.
- [ ] CORS for `scholarshiptop.com` on production API confirmed.
- [ ] Freeze window approved and announced.
- [ ] Rollback owner online.
- [ ] Hosted Supabase retained >= 7 days.
- [ ] 3 parser services stop/disable verified.
- [ ] Fresh dump tested in tmux/screen.
- [ ] `site.env` + parser env backups created and restorable.
- [ ] Magic link/OAuth risk accepted or tested.
- [ ] Rollback decision deadline agreed (T+45 min).

---

## Deliverables

| Path | Purpose |
|------|---------|
| `scripts/vps-migration/stage5b-inspect.sh` | Read-only cutover readiness inspection |
| `reports/vps-migration/25-stage5b-precutover-dry-run-readiness-2026-06-24.md` | This report |

---

## Confirmation

Production site, production `site.env`, production container, parsers, and hosted Supabase were **not changed**. No swap/nginx/env changes were applied in Stage 5B.

---

## Commit hash

`ce391b9`
