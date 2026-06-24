# Stage 11 — Parsers Railway → VPS bulk cutover

**Дата:** 2026-06-24  
**Scope:** 10 parser services from Railway project **Парсер** → VPS `213.155.22.74`  
**Production site:** https://scholarshiptop.com (unchanged; Cloudflare → VPS)  
**Supabase:** external, schema untouched

## Verdict: **PASS_WITH_WARNINGS**

All 10 Railway parser services **down** (not deleted). VPS has matching cron (7) + systemd repeaters (3). Pre- and post-cutover production smoke **PASS**. Three Online repeaters started successfully and entered 2h sleep cycle. Cron parsers will run at next `0 */12 * * *` boundary. No parsers manually bulk-triggered.

**Warnings:**
- VPS required `python3.12-venv` apt install before venv creation
- SSH disconnect during first `pip install` (completed on retry)
- Repeater logs show `Telegram report skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_IDS not configured` (non-blocking)
- VPS RAM ~2.7 GiB used immediately after 3 repeaters started (monitor first 12h cron window)

---

## 1. Parser repo

| Item | Value |
|------|-------|
| Local path | `C:\dev\1Parcer 04\scholarships_parsers` |
| GitHub | `https://github.com/loomany/scholarships_parsers.git` |
| Branch / commit (VPS clone) | `main` @ `c6cdae1` |
| Runtime | Python 3.12 + venv |
| Entry (cron) | `python -u run_all.py` (via `PARSER_SOURCES` in env) |
| Entry (Online) | `python -u repeater.py` → `EXECUTE_SCRIPT` (default `run_all.py`) |
| Dependencies | `requirements.txt` (supabase, playwright, openai, bs4, requests) |

---

## 2. Railway services inventory (before cutover)

| Railway service | Type | Status (before) | Start command | Schedule | Env keys (excl. RAILWAY_*) |
|-----------------|------|-----------------|---------------|----------|---------------------------|
| **ieFA** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **27** |
| **scholars4dev** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **22** |
| **opportunitydesk** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **21** |
| **DAAD** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **25** |
| **scholarships360** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **22** |
| **wemakescholars** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **24** |
| **mina7portal** | cron | Completed / STOPPED | `python run_all.py` | `0 */12 * * *` | **26** |
| **simpler_grants_gov** | Online repeater | SUCCESS / running | `python repeater.py` | none (2h loop via `REPEATER_SLEEP_HOURS`) | **32** |
| **bigfuture** | Online repeater | SUCCESS / running | `python repeater.py` | none (2h loop) | **41** |
| **scholarship_america** | Online repeater | SUCCESS / running | `python repeater.py` | none (2h loop) | **30** |

**Notes:**
- Cron services on Railway also logged `[REPEATER]` 2h sleep after each run; VPS cron uses one-shot `run_all.py` only (12h external schedule).
- Each service env sets `PARSER_SOURCES` to a single source key.
- Online services set `EXECUTE_SCRIPT` + `REPEATER_SLEEP_HOURS`.
- All parsers write to **Supabase** (external). Some use **Playwright** (bigfuture, etc.). No GitHub commit/push from parsers.

---

## 3. Parser commands (VPS)

| Slug | Wrapper | Inner command |
|------|---------|---------------|
| iefa | `run-iefa-once.sh` | `run-parser-cron.sh iefa` → `venv/bin/python -u run_all.py` |
| scholars4dev | `run-scholars4dev-once.sh` | same pattern |
| opportunitydesk | `run-opportunitydesk-once.sh` | same |
| daad | `run-daad-once.sh` | same |
| scholarships360 | `run-scholarships360-once.sh` | same |
| wemakescholars | `run-wemakescholars-once.sh` | same |
| mina7portal | `run-mina7portal-once.sh` | same |
| simpler-grants-gov | systemd | `run-parser-repeater.sh simpler-grants-gov` → `venv/bin/python -u repeater.py` |
| bigfuture | systemd | `run-parser-repeater.sh bigfuture` |
| scholarship-america | systemd | `run-parser-repeater.sh scholarship-america` |

Generic engines: `ops/vps/scripts/run-parser-cron.sh`, `run-parser-repeater.sh` (flock + nice/ionice on cron runs).

---

## 4. Schedules

| Slug | VPS mechanism | Schedule |
|------|---------------|----------|
| iefa, scholars4dev, opportunitydesk, daad, scholarships360, wemakescholars, mina7portal | `/etc/cron.d/scholarshiptop-parser-*` | `0 */12 * * *` (root) |
| simpler-grants-gov, bigfuture, scholarship-america | systemd (Restart=always) | internal 2h repeater loop |

---

## 5. Env files (key counts only)

| VPS file | Keys |
|----------|------|
| `/opt/scholarshiptop-parsers/env/iefa.env` | 27 |
| `/opt/scholarshiptop-parsers/env/scholars4dev.env` | 22 |
| `/opt/scholarshiptop-parsers/env/opportunitydesk.env` | 21 |
| `/opt/scholarshiptop-parsers/env/daad.env` | 25 |
| `/opt/scholarshiptop-parsers/env/simpler-grants-gov.env` | 32 |
| `/opt/scholarshiptop-parsers/env/bigfuture.env` | 41 |
| `/opt/scholarshiptop-parsers/env/scholarship-america.env` | 30 |
| `/opt/scholarshiptop-parsers/env/scholarships360.env` | 22 |
| `/opt/scholarshiptop-parsers/env/wemakescholars.env` | 24 |
| `/opt/scholarshiptop-parsers/env/mina7portal.env` | 26 |

All `chmod 600`, `root:root`. Shared keys across services: Supabase URL/keys, OpenAI, parser toggles; service-specific: `PARSER_SOURCES`, source-specific limits.

---

## 6. VPS target paths

```text
/opt/scholarshiptop-parsers/app          # git clone (loomany/scholarships_parsers)
/opt/scholarshiptop-parsers/venv         # Python 3.12 venv + playwright chromium
/opt/scholarshiptop-parsers/env/         # per-parser .env (600)
/opt/scholarshiptop-parsers/scripts/     # wrappers + generic runners
/opt/scholarshiptop-parsers/logs/        # per-run and repeater logs
```

Main site path `/opt/scholarshiptop` **not modified**.

---

## 7. Wrappers created

Deployed to `/opt/scholarshiptop-parsers/scripts/` (LF-only, `chmod +x`):

- `run-parser-cron.sh`, `run-parser-repeater.sh`, `bootstrap-vps.sh`
- `run-{iefa,scholars4dev,opportunitydesk,daad,scholarships360,wemakescholars,mina7portal}-once.sh`
- `run-{simpler-grants-gov,bigfuture,scholarship-america}-once.sh` (thin wrappers; used by systemd via repeater script)

Repo tooling (parser repo): `ops/vps/scripts/{export-railway-env,upload-env-to-vps,deploy-to-vps,validate-vps,enable-vps-schedules,railway-down-all}.mjs`

---

## 8. Cron / systemd installed

**Cron (`/etc/cron.d/`):**
- `scholarshiptop-parser-iefa`
- `scholarshiptop-parser-scholars4dev`
- `scholarshiptop-parser-opportunitydesk`
- `scholarshiptop-parser-daad`
- `scholarshiptop-parser-scholarships360`
- `scholarshiptop-parser-wemakescholars`
- `scholarshiptop-parser-mina7portal`

**Systemd (`/etc/systemd/system/`, enabled + active):**
- `scholarshiptop-parser-simpler-grants-gov.service`
- `scholarshiptop-parser-bigfuture.service`
- `scholarshiptop-parser-scholarship-america.service`

---

## 9. Railway down actions

All executed via `railway down -s "<name>" -y` (services **not deleted**):

| Service | Result |
|---------|--------|
| ieFA | ok |
| scholars4dev | ok |
| opportunitydesk | ok |
| DAAD | ok |
| simpler_grants_gov | ok |
| bigfuture | ok |
| scholarship_america | ok |
| scholarships360 | ok |
| wemakescholars | ok |
| mina7portal | ok |

---

## 10. Production smoke

**Pre-cutover:** `node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS** (/, sitemap, key scholarship pages 200).

**Post-cutover VPS health:**
- `https://scholarshiptop.com/` → HTTP/2 200
- `https://scholarshiptop.com/sitemap.xml` → HTTP/2 200
- Docker: `scholarshiptop-nginx`, `scholarshiptop-site` running
- `bash -n` on all parser wrappers → ok
- 10 env files, venv Python 3.12.3, `run_all.py` + `repeater.py` present

**Lightweight validation only** — no bulk manual parser runs. Repeaters auto-started on systemd enable (expected for Online services).

---

## 11. First-run monitoring plan

After next cron boundary (`:00` every 12h) and repeater cycles:

```bash
# Logs
sudo ls -lah /opt/scholarshiptop-parsers/logs/
sudo tail -n 100 /opt/scholarshiptop-parsers/logs/*.log

# Systemd repeaters
systemctl status scholarshiptop-parser-bigfuture
systemctl status scholarshiptop-parser-simpler-grants-gov
systemctl status scholarshiptop-parser-scholarship-america

# VPS load
free -h && uptime && df -h /

# Site
curl -sI https://scholarshiptop.com/ | head -1
```

Check: exit codes in `*-run-*.log`, insert/update counts in parser stdout, OOM/restarts, duplicate schedules (Railway should stay down).

**Immediate post-cutover:** all 3 repeaters `active`; bigfuture log shows parser discovery running; simpler-grants-gov entered 2h sleep after first execution.

---

## 12. Rollback (per parser)

```bash
# Stop VPS schedule
sudo rm -f /etc/cron.d/scholarshiptop-parser-<slug>
sudo systemctl disable --now scholarshiptop-parser-<slug>.service

# Re-enable Railway (do not delete)
railway redeploy -s "<Railway service name>" --from-source -y
```

Examples:
- Cron: `sudo rm -f /etc/cron.d/scholarshiptop-parser-iefa` then `railway redeploy -s "ieFA " --from-source -y`
- Repeater: `sudo systemctl disable --now scholarshiptop-parser-bigfuture` then `railway redeploy -s "bigfuture" --from-source -y`

Main site remains on VPS throughout rollback.

---

## 13. Summary

| Check | Status |
|-------|--------|
| Railway parsers down | yes (10/10) |
| VPS cron for cron-only parsers | yes (7/7) |
| VPS systemd for Online parsers | yes (3/3 active) |
| Duplicate Railway+VPS schedules | no |
| Main site healthy | yes |
| Supabase schema touched | no |
| Secrets in git/report | no |

**Next:** monitor first scheduled cron runs and repeater 2h cycles; confirm Supabase row updates per source without overlap errors.
