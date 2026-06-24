# Stage 9C — Translation (Перевод) migration (Railway → VPS)

**Дата:** 2026-06-24  
**Scope:** только Railway `Перевод` → VPS manual worker capability  
**Production:** https://scholarshiptop.com → Cloudflare Full (strict) → VPS `213.155.22.74`

## Verdict: **PASS_WITH_WARNINGS**

`Перевод` — **completed one-shot worker** (не cron). VPS wrapper установлен и проверен dry-run. **Cron не нужен и не установлен.** Railway deployment снят (`NO DEPLOYMENT`). Полный production batch **намеренно не запускался** (dormant worker; env `I18N_WORKER_START_WAVE` отстаёт от DB next safe wave). Production smoke **PASS**.

---

## Step 1 — Railway pre-state (read-only)

| Item | Value |
|------|-------|
| Service | **Перевод** |
| Service ID | `db1e0669-5f3d-4849-a7f0-50859100d7ef` |
| Type | **One-shot worker** (не cron) |
| Schedule | **нет** |
| Status (snapshot) | **Completed / STOPPED** |
| Start command | `npm run i18n:scholarship-autopilot:railway` → `scripts/i18n/scholarship-detail-autopilot/run-railway-worker.ts` |
| Build command | default RAILPACK |
| Restart policy | `ON_FAILURE` (Railway recommends NEVER for wave safety) |
| Env keys (export) | **13** |
| DB writes | **да** — `content_translations`, worker progress/lock tables |
| Local files | **да** — reports under `reports/seo/` on worker host |
| Git commit/push | **нет** |
| OpenAI / translation API | **да** — `generateWaveOverlays` in relaxed autopilot |
| Notifications | **нет** Telegram; smoke HTTP checks against site sitemaps |
| Still needed active? | **нет** — last successful run **2026-05-26** (waves 193–195); worker progress `completed`, `nextWave=196` |
| Last run summary (logs) | `target=500`, `waveSize=200`, waves 193–195 accepted, `rowsAdded=1000`, exit **0** |

---

## Step 2 — VPS env

| Check | Result |
|-------|--------|
| `/opt/scholarshiptop/env/translation.env` | **present**, `chmod 600` |
| Key count | **13** |
| Key names | `I18N_PILOT_ALLOW_DB_WRITES`, `I18N_PILOT_ALLOW_PRODUCTION`, `I18N_SCHOLARSHIP_AUTOPILOT`, `I18N_WORKER_MAX_RUNTIME_MINUTES`, `I18N_WORKER_REQUIRE_LOCK`, `I18N_WORKER_START_WAVE`, `I18N_WORKER_TARGET`, `I18N_WORKER_WAVE_SIZE`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SITE_URL`, `SMOKE_BASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

**Warning:** `I18N_WORKER_START_WAVE` in env points to **193** (last Railway deploy), while DB/worker state reports **next safe wave 196**. Must update before any production manual run.

---

## Step 3 — Safe modes

| Capability | Available? | Mechanism |
|------------|------------|-----------|
| Dry-run (no `content_translations` writes) | **yes** | `I18N_WORKER_DRY_RUN=1` → `--dry-run-only` on child; skips `publishWave` |
| Read-only status | **yes** | `npm run i18n:scholarship-autopilot:status` / wrapper `--status` |
| Disable DB content writes | **yes** | dry-run path (`rowsAdded=0`) |
| Disable OpenAI | partial | dry-run still calls `generateWaveOverlays` (may use cache); no publish |
| DB lock | **yes** | `i18n_scholarship_autopilot_*` RPC + `I18N_WORKER_REQUIRE_LOCK` |
| Safe while Railway Completed | **yes** | Railway not running; dry-run uses minimal `target=1`, `waveSize=1` |

**Script chain:** `run-railway-worker.ts` → spawns `run-relaxed-autopilot.ts` with env from `translation.env`.

---

## Step 4 — VPS wrapper (no cron)

| Artifact | Path |
|----------|------|
| One-shot wrapper | `/opt/scholarshiptop/scripts/run-translation-once.sh` |
| Repo template | `ops/vps/scripts/run-translation-once.sh` |

**Modes:**

```bash
sudo bash /opt/scholarshiptop/scripts/run-translation-once.sh --status    # read-only
sudo bash /opt/scholarshiptop/scripts/run-translation-once.sh --dry-run   # safe test
sudo bash /opt/scholarshiptop/scripts/run-translation-once.sh             # production (manual only)
```

Dry-run overrides (not in env file): `I18N_WORKER_DRY_RUN=1`, `TARGET=1`, `WAVE_SIZE=1`, `REQUIRE_LOCK=0`, `START_WAVE=196`.

Deploy note: write script on VPS via heredoc or `perl -pi -e 's/\r$//'` after SCP from Windows.

---

## Step 5 — Safe dry-run / status (Railway unchanged)

### Status (read-only)

```bash
sudo bash /opt/scholarshiptop/scripts/run-translation-once.sh --status
```

| Item | Result |
|------|--------|
| Exit code | **0** |
| Duration | ~228s (public sitemap fetches via Cloudflare) |
| Log | `/opt/scholarshiptop/logs/translation-run-20260624T154323Z.log` |
| `nextSafeStartWave` | **196** |
| `lastAcceptedWave` | **195** |
| `workerProgress.status` | **completed** |
| `advisoryLockHeld` | false (at status time) |
| `liveEs` / `liveFr` sitemap loc | **9063** / **9063** |
| `publishedEsFrRows` | **34902** |

### Dry-run attempts

| Attempt | Result | Notes |
|---------|--------|-------|
| #1 (`START_WAVE` from env = 193) | exit **1** | Wave 193 has existing rows (`partial_broken`); **no content writes**, `openAiCost=0`; left advisory lock held |
| #2 (lock held, `LOCK_EXIT_ZERO_ON_HELD=1`) | exit **0** | Exited early — not a full pipeline test |
| #3 (`START_WAVE=196`, `REQUIRE_LOCK=0`) | exit **0** | **PASS** — wave 196, 1 candidate, `rowsAdded=0`, `dryRun=true`, ~6.5 min |

**Final dry-run log:** `/opt/scholarshiptop/logs/translation-run-20260624T160212Z.log`

| Metric | Value |
|--------|-------|
| `wavesAccepted` | 1 |
| `scholarshipsAttempted` | 1 |
| `rowsAdded` | **0** |
| `openAiCost` | 0 (reported) |
| Sitemap ES/FR | **9063 → 9063** (unchanged) |
| Site health after | **healthy** |

---

## Step 6 — Railway action

| Item | Result |
|------|--------|
| Pre-migration | Already **Completed / STOPPED** (no active deployment) |
| Action | `railway down -s "Перевод" -y` |
| Post-down | **NO DEPLOYMENT** |
| Service deleted | **no** |
| Env preserved | **yes** |
| Other Railway services | **untouched** |

No cron to pause — service was never scheduled.

---

## Step 7 — Controlled VPS production run

**Intentionally skipped.**

| Reason | Detail |
|--------|--------|
| Service type | One-shot worker, dormant since **2026-05-26** |
| Risk | Production env would attempt large batch (`I18N_WORKER_TARGET` / `WAVE_SIZE` from env) and write `content_translations` |
| Env drift | `I18N_WORKER_START_WAVE=193` vs DB `nextSafeStartWave=196` |
| Verification | Dry-run at wave 196 proved VPS can execute worker end-to-end without publishing |

**Before any future production manual run:**

1. Update `I18N_WORKER_START_WAVE=196` (or run `--status` and align).
2. Ensure advisory lock is free (`--status` → `advisoryLockHeld: false`).
3. Run `sudo bash /opt/scholarshiptop/scripts/run-translation-once.sh` (no `--dry-run`).

---

## Step 8 — Schedule

| Item | Value |
|------|-------|
| Railway had schedule? | **no** |
| VPS cron installed? | **no** (`/etc/cron.d/scholarshiptop-translation` absent) |
| Trigger model | **manual only** via `run-translation-once.sh` |

---

## Production smoke (post-migration)

`node scripts/vps-migration/stage-7-post-cutover-smoke.mjs` → **PASS**

| URL | Status | SEO |
|-----|--------|-----|
| `/` | 200 | OK |
| `/sitemap.xml` | 200 | valid XML (83 loc) |
| `/sitemaps/scholarships-0.xml` | 200 | valid XML (682 loc) |
| `/scholarships/no-essay` | 200 | **index, follow** |
| `/scholarships/closing-soon` | 200 | **index, follow** |
| `/scholarships/california` | 200 | **noindex, follow** |

---

## Active state after migration

### VPS containers

| Container | Status |
|-----------|--------|
| `scholarshiptop-site` | Up, **healthy** |
| `scholarshiptop-nginx` | Up |

### VPS cron

| Job | Schedule | Status |
|-----|----------|--------|
| seo-audit | `0 9 * * *` | enabled |
| seo-generation | `0 */3 * * *` | enabled |
| **translation** | — | **not installed** (manual only) |

### Railway

| Service | Status |
|---------|--------|
| **Перевод** | **NO DEPLOYMENT** |
| Сайт / Сео Аудит / Сео генерация | down (prior stages) |
| Скрипты, Сео индексация, Рассылка, … | still active |

---

## Warnings

1. **`I18N_WORKER_START_WAVE` stale (193 vs 196)** — update env before production manual run.
2. **Advisory lock** — first dry-run may have left lock until TTL (~12h); dry-run #3 used `REQUIRE_LOCK=0`; production runs need free lock.
3. **Worker progress metadata** — dry-run may update `i18n_scholarship_worker_*` progress rows (not `content_translations`).
4. **Report files** — dry-run wrote/updated files under `/opt/scholarshiptop/app/reports/seo/` (local, not git).
5. **No production batch** — by design for dormant one-shot service.

---

## Rollback

```bash
# Remove VPS translation cron if ever installed
sudo rm -f /etc/cron.d/scholarshiptop-translation

# Restore Railway worker (manual trigger only — no schedule)
railway redeploy -s "Перевод" --from-source -y
railway service status -s "Перевод"   # expect SUCCESS when deployed

# Do NOT run Railway and VPS workers in parallel (DB lock / wave race risk)
```

Production site remains on VPS (no DNS change).

---

## Files touched (repo)

| Path | Purpose |
|------|---------|
| `ops/vps/scripts/run-translation-once.sh` | VPS one-shot runner (`--status`, `--dry-run`, production) |

No secrets committed. No Supabase schema/DNS changes. No other Railway services modified except `Перевод` down.
