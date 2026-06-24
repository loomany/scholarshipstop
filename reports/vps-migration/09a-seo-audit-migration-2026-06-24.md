# Stage 9A — SEO Audit migration (Railway → VPS)

**Дата:** 2026-06-24  
**Scope:** только Railway `Сео Аудит` → VPS job `seo-audit`  
**Production:** https://scholarshiptop.com → Cloudflare → VPS `213.155.22.74`

## Verdict: **FAIL**

VPS manual run не прошёл (sitemap fetch timeout). VPS cron **не включён**. Railway `Сео Аудит` **восстановлен** (`SUCCESS`, schedule `0 9 * * *`).  
Post-run production smoke **не прошёл** (timeouts) — VPS site container **unhealthy**, отдельный инцидент, не блокер rollback SEO Audit.

---

## Step 1 — Railway pre-state (read-only)

| Item | Value |
|------|-------|
| Service | **Сео Аудит** |
| Service ID | `1bcdbfab-8a9c-4c72-93fa-9a2e37c70858` |
| Type | Cron job |
| Schedule | `0 9 * * *` (09:00 UTC daily) |
| Start command | `npm run audit:jsonld-sitemap:prod` → `npx tsx scripts/audit-jsonld-sitemap.ts` |
| Deploy source | `loomany/scholarshipstop` @ `main` |
| Idle status | **Completed** (deployment stopped between runs) |
| Next run (snapshot) | ~18h |
| Env keys | **5** (names only, see VPS env below) |
| DB writes | **нет** (read-only HTTP audit) |
| External requests | **да** — production URLs + Telegram |
| Output | Telegram report + job markers in logs (no DB, no local report files by default) |

---

## Step 2 — VPS prep (no cron)

| Check | Result |
|-------|--------|
| `/opt/scholarshiptop/env/seo-audit.env` | **present** |
| Env key count | **5** |
| Env key names | `JSONLD_AUDIT_BASE_URL`, `JSONLD_AUDIT_EXIT_NONZERO`, `JSONLD_AUDIT_SCHOLARSHIP_SAMPLE`, `TELEGRAM_ADMIN_IDS`, `TELEGRAM_BOT_TOKEN` |
| `JSONLD_AUDIT_BASE_URL` | set to `https://scholarshiptop.com` (host only, value not logged) |
| Audit script | `/opt/scholarshiptop/app/scripts/audit-jsonld-sitemap.ts` |
| Node on host | v22.23.0 |
| Run wrapper | `/opt/scholarshiptop/scripts/run-seo-audit-once.sh` (installed) |
| VPS cron file | **not installed** (`/etc/cron.d/scholarshiptop-seo-audit` absent) |
| Active containers | `scholarshiptop-site`, `scholarshiptop-nginx` only |

**Repo scaffold added (not deployed to VPS compose):**

- `ops/vps/scripts/run-seo-audit-once.sh` — one-shot host run, logs to `/opt/scholarshiptop/logs/`
- `ops/vps/cron/scholarshiptop-seo-audit` — template for `0 9 * * *` (not enabled)
- `ops/vps/docker-compose.yml` — `seo-audit` service definition under `jobs-disabled` / `seo-audit` profile (not started)

---

## Step 3 — Railway disabled

| Item | Value |
|------|-------|
| Command | `railway down -s "Сео Аудит" -y` |
| Effect | Active deployment removed; service showed **Failed**; schedule **preserved** (`0 9 * * *`, next run ~18h) |
| Railway env / service | **not deleted** |

---

## Step 4 — Controlled VPS manual run

| Item | Value |
|------|-------|
| Command | `sudo bash /opt/scholarshiptop/scripts/run-seo-audit-once.sh` |
| Mode | single run, no cron |
| Log file | `/opt/scholarshiptop/logs/seo-audit-run-20260624T140259Z.log` |
| Duration | ~46s |
| Script exit (wrapper bug) | reported `0` (incorrect — fixed in repo wrapper) |
| **Actual job exit** | **`1`** (`=== exit_code=1 ===` in log) |
| Error | `Failed to fetch sitemap index https://scholarshiptop.com/sitemap.xml (HTTP not OK)` |
| Root cause | Node `fetch` to public origin via Cloudflare **times out** at 45s from VPS; independent test: `fetch_error … timeout` at ~45s. Site container later **unhealthy** (memory pressure, Supabase socket errors). |
| Reports created | log only; no new audit JSON/MD under `reports/` |
| Telegram | not confirmed (job failed before sampling) |

**Note:** wrapper initially masked failure (exit code taken after `echo` inside redirect group). Fixed in `ops/vps/scripts/run-seo-audit-once.sh` for retry.

---

## Step 5 — Production smoke (post-run)

### Initial check (immediately after audit run)

| URL | Expected | Result |
|-----|----------|--------|
| `/` | 200 | **timeout** (>45–120s) |
| `/sitemap.xml` | 200 | **timeout** |
| `/scholarships/no-essay` | 200, index,follow | **timeout** |
| `/scholarships/closing-soon` | 200, index,follow | **timeout** |

**Cause:** `scholarshiptop-site` **unhealthy** (load ~7, RAM pressure, Supabase `UND_ERR_SOCKET` in logs). Not caused by seo-audit (job failed before URL sampling).

### Remediation + re-smoke

`sudo docker restart scholarshiptop-site` → container **healthy** within ~90s.

`node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS**:

| URL | Status | SEO |
|-----|--------|-----|
| `/` | 200 | OK |
| `/sitemap.xml` | 200 | valid XML |
| `/scholarships/no-essay` | 200 | **index, follow** |
| `/scholarships/closing-soon` | 200 | **index, follow** |
| 500/502/525/526 | **none** | |

**VPS containers:** `scholarshiptop-site` (healthy), `scholarshiptop-nginx` only. No persistent seo-audit container.

---

## Step 6 — VPS schedule

| Item | Value |
|------|-------|
| VPS cron enabled | **no** (manual run FAIL) |
| Action taken | Railway rollback (below) |

---

## Rollback performed

Manual run FAIL → rollback per plan:

1. VPS seo-audit schedule: **not enabled** (nothing to disable)
2. Railway restore:
   - `railway redeploy -s "Сео Аудит" -y` → still **Failed**
   - `railway redeploy -s "Сео Аудит" --from-source -y` → deployment `0d2277d5…` → **SUCCESS**
3. Railway status after rollback: deployment **SUCCESS**; `railway status` shows **Сео Аудит** cron `0 9 * * *`, next run ~18h (briefly **Online** while redeploy finished)
4. Cleanup: removed test `/etc/hosts` loopback entry for `scholarshiptop.com` (if present)
5. Production site: remains on VPS (no DNS change)

### Rollback commands (reference)

```bash
# Disable VPS cron (if ever enabled)
sudo rm -f /etc/cron.d/scholarshiptop-seo-audit

# Restore Railway SEO Audit
railway redeploy -s "Сео Аудит" --from-source -y
railway service status -s "Сео Аудит"   # expect SUCCESS

# Verify schedule
railway status   # Сео Аудит: Completed/SUCCESS, 0 9 * * *
```

---

## Recommendations before retry (Stage 9A bis)

1. **Stabilize VPS site** — monitor `scholarshiptop-site` health after restart; 1GB RAM + Supabase egress may need tuning before audit load.
2. **Origin loopback for audit** — from VPS, public Cloudflare path is slow (>45s). Options:
   - `/etc/hosts`: `127.0.0.1 scholarshiptop.com` + `NODE_TLS_REJECT_UNAUTHORIZED=0` in run wrapper only (Cloudflare Origin cert), **or**
   - increase `FETCH_TIMEOUT_MS` in audit script via env (e.g. `JSONLD_AUDIT_FETCH_TIMEOUT_MS`), **or**
   - run audit in Docker on `site` network hitting `http://site:3000` with URL rewrite (script change).
3. Re-run `run-seo-audit-once.sh`; on **PASS**, install `ops/vps/cron/scholarshiptop-seo-audit` → `/etc/cron.d/` and `railway down -s "Сео Аудит" -y`.

---

## Files touched (repo)

| Path | Purpose |
|------|---------|
| `ops/vps/scripts/run-seo-audit-once.sh` | VPS one-shot runner |
| `ops/vps/cron/scholarshiptop-seo-audit` | Cron template (not active) |
| `ops/vps/docker-compose.yml` | `seo-audit` job definition (not started) |
| `ops/vps/scripts/stage-9a-prep.sh` | Prep helper |
| `ops/vps/scripts/cleanup-seo-audit-hosts.sh` | Remove test hosts entry |

No secrets committed. No Supabase/DNS/other Railway services modified (except `Сео Аудит` down → restored).
