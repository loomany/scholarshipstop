# Stage 6C — Post-cutover monitoring + Railway shutdown verification

**Дата:** 2026-06-25  
**VPS:** `213.155.22.74`  
**Режим:** READ-ONLY ONLY — никаких изменений production, Railway, hosted Supabase, docker, systemd, cron.  
**Контекст:** Stage 6B real cutover `PASS_WITH_WARNINGS` — report `29-stage6b-real-cutover-2026-06-25.md`.  
**Cutover freeze timestamp (reference):** `2026-06-25T17:44:40Z`  
**Monitoring window:** ~`19:00–19:05 UTC` (same calendar day, ~1h20m after parser re-switch).

## Verdict: **PASS_WITH_WARNINGS**

Production на VPS **стабилен**: site, self-host API, auth и 3 VPS-парсера работают на self-host; hosted Supabase **не получает новых writes** с момента cutover dump (`21171` scholarships frozen).  
**Предупреждение:** в Railway project **`Парсер`** 7 из 10 parser services всё ещё **активны как cron jobs** (`0 */12 * * *`) с env **HOSTED** — при следующем тике (~`00:00 UTC`) они **могут снова писать в hosted Supabase**. Это не ломает текущий production (VPS), но создаёт drift/future interference. **Rollback не рекомендуется.**

---

## 1. Site smoke — **PASS**

| Check | Result |
|-------|--------|
| `GET /` | **200** |
| `GET /sitemap.xml` | **200** |
| 5 scholarship detail pages | **200 × 5** |
| `site.env` target | **SELFHOST** (`https://scholarshiptop.com/supabase`) |
| Client bundle hosted **project** refs (`*.supabase.co`) | **0 files** |
| Client bundle self-host refs | **11 files** |
| Site container | `healthy` (Up ~28 min at check time) |

**Note:** naive grep `supabase.co` находит 1 файл с `supabase.com/docs/...` (SDK documentation string) — это **не** hosted project URL. Скан `*.supabase.co` → 0.

---

## 2. Self-host API — **PASS**

| Check | Result |
|-------|--------|
| `/supabase/health` | **200** |
| `/supabase/auth/v1/health` | **200** |
| `scholarships_safe_listing` count | **21171** |
| anon `profiles` | **[]** (RLS) |
| service_role `profiles` | **≥1** |
| RPC `get_comparison_data` | **200** |

---

## 3. Auth smoke (live production self-host) — **PASS**

`STAGE_5C1_AUTH_PASS` — signUp / signInWithPassword / getUser / profiles upsert / refreshSession / signOut / cleanup.

| Table | Before smoke | After smoke |
|-------|-------------:|------------:|
| auth.users | 556 | 556 |
| auth.identities | 567 | 567 |
| public.profiles | 551 | 551 |

Counts unchanged after cleanup → no test residue. (556/551 vs cutover baseline 555/550 — +1 organic user since cutover, expected.)

---

## 4. Parser VPS result — **PASS**

All 3 VPS systemd parsers **active**, env → **SELFHOST**, 0 hosted URLs in logs, completed at least one post-cutover cycle:

| Service | State | Env | Post-cutover run | Next run (UTC) | Hosted refs | Errors |
|---------|-------|-----|------------------|----------------|-------------|--------|
| `scholarshiptop-parser-bigfuture` | active | SELFHOST | finished ~19:04 | 20:54 | 0 | 0 |
| `scholarshiptop-parser-scholarship-america` | active | SELFHOST | finished ~19:01 | 20:46 | 0 | 0 |
| `scholarshiptop-parser-simpler-grants-gov` | active | SELFHOST | finished ~19:04 | 20:39 | 0 | 0 |

Application logs: `/opt/scholarshiptop-parsers/logs/*-repeater.log` (journald only shows systemd start).  
No parser systemd timers/cron on VPS.

---

## 5. Hosted Supabase write-stop confirmation — **PASS (read-only)**

| Check | Result |
|-------|--------|
| Hosted project still exists / reachable | **YES** — REST root `401` (expected without full auth on root) |
| Hosted `scholarships_safe_listing` count | **21171** (matches cutover dump exactly) |
| VPS prod `public.scholarships` count | **21171** |
| Growth on hosted since cutover | **NONE detected** (frozen at dump snapshot) |
| Hosted modified/deleted | **NO** |

**Conclusion:** hosted Supabase is intact as rollback fallback; **no new parser writes** observed on hosted since cutover freeze (`17:44:40Z`). VPS parsers write to self-host only.

---

## 6. Railway verification — project `Парсер`

**Project ID:** `b2bc325b-d7b0-4a3f-b0ec-c5d186db13ff`  
**Environment:** `production` (`46c12833-0621-438c-9091-e2e44ae3c63d`)  
**Method:** Railway CLI read-only (`railway status`, `railway variables --kv`, `railway logs --json`). No deploy/restart/delete/variable changes.

### Status table — all 10 parser services

| # | Service (Railway name) | Type | Deploy status | Schedule | Replicas running | Last log (UTC) | Logs after cutover? | Supabase target | Active now? |
|---|------------------------|------|---------------|----------|------------------|----------------|---------------------|-----------------|-------------|
| 1 | **bigfuture** | long-running service | Offline / no active deployment | — | 0 | 2026-06-24T17:04:38Z | **NO** | HOSTED | **NO** |
| 2 | **scholarship_america** | long-running service | **FAILED** | — | 0 | 2026-06-24T17:04:53Z | **NO** | HOSTED | **NO** |
| 3 | **simpler_grants_gov** | long-running service | **FAILED** | — | 0 | 2026-06-24T17:04:24Z | **NO** | HOSTED | **NO** |
| 4 | **DAAD** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 (between runs) | 2026-06-25T12:02:43Z | **NO** | HOSTED | **scheduled** |
| 5 | **ieFA** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 | 2026-06-25T12:04:59Z | **NO** | HOSTED | **scheduled** |
| 6 | **wemakescholars** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 | 2026-06-25T12:52:10Z | **NO** | HOSTED | **scheduled** |
| 7 | **scholars4dev** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 | 2026-06-25T13:02:57Z | **NO** | HOSTED | **scheduled** |
| 8 | **scholarships360** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 | 2026-06-25T13:14:08Z | **NO** | HOSTED | **scheduled** |
| 9 | **opportunitydesk** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 | 2026-06-25T13:34:41Z | **NO** | HOSTED | **scheduled** |
| 10 | **mina7portal** | cron job | SUCCESS (completed) | `0 */12 * * *` | 0 | 2026-06-25T15:01:24Z | **NO** | HOSTED | **scheduled** |

**Cutover reference:** `2026-06-25T17:44:40Z` — all last logs are **before** this timestamp.

### Railway writing / interference assessment

| Question | Answer |
|----------|--------|
| Any running containers/jobs **right now**? | **NO** — 0 replicas; crons between runs |
| Logs showing parser execution **after cutover**? | **NO** (all 10 services) |
| Scheduled jobs still active? | **YES** — 7 cron jobs with `0 */12 * * *` (next tick ~`00:00 UTC`) |
| Env still points to hosted? | **YES** — all 10 services classified `HOSTED` (values not printed) |
| Webhooks/restarts triggering parsers? | **NO evidence** in status/logs |
| Services deleted? | **NO** |
| Variables changed? | **NO** |

### Whether Railway can interfere: **YES (future risk)**

- **Currently:** Railway parsers are **not writing** — no post-cutover logs, no running replicas.
- **Future:** 7 cron parsers remain **enabled** on Railway with **HOSTED** `SUPABASE_URL`. At next schedule (~midnight UTC / noon UTC) they **will** execute and write to hosted Supabase unless paused/disabled in a **future** maintenance window (not done in this read-only stage).
- The 3 long-running Railway parsers (`bigfuture`, `scholarship_america`, `simpler_grants_gov`) are **down/failed/offline** — they do not conflict with VPS equivalents **now**, but their env still references hosted.
- **Recommendation (informational only, not executed):** in a future approved stage, pause/disable the 7 Railway cron jobs or retarget them — **do not delete** services/variables per rollback policy.

### Site project `Сайт/Контент Хаб` (informational)

Checked in passing: site service shows **Failed** on Railway (expected — production moved to VPS). No parser services in this project. Not modified.

---

## 7. Resources — **PASS_WITH_MINOR_NOTES**

| Metric | Value |
|--------|-------|
| RAM | 3.8 GiB total; **~2.0 GiB available** |
| Swap | **8.0 GiB** total (4+4); **~5.6 GiB free** |
| Disk `/` | 79 GiB; **49 GiB free** (36%) |
| Load | 1.28 / 0.95 / 1.68 |
| Uptime | ~1 day 4h |
| DB `scholarshiptop_prod` | **847 MB** |
| OOM / killed processes | **0** in dmesg |

**Containers (all up):** `scholarshiptop-site` healthy, `nginx`, `gotrue-test` healthy, `postgrest-test`, `supabase-api-gateway-test`.

**Log notes (benign):**
- **nginx:** 0 error-like lines (3h window)
- **postgrest:** 0 error-like lines
- **gotrue:** 4 lines matched `error` — all `Invalid login credentials` (level=info) from real `/signin` attempts; **not** service failures

---

## Warnings summary

| ID | Severity | Finding | Impact |
|----|----------|---------|--------|
| W1 | **Medium** | 7 Railway cron parsers still scheduled, env=HOSTED | Next cron tick may write to hosted Supabase (drift), not VPS production |
| W2 | Low | GoTrue logs contain `invalid_credentials` | Benign user login failures |
| W3 | Info | SDK bundle contains `supabase.com/docs` string | Not a hosted project leak |

---

## Rollback recommendation: **NO**

Production VPS stack is healthy. Hosted Supabase frozen at cutover snapshot and available as fallback. No critical failures. Railway interference is **latent/future**, not active.

---

## Hard constraints confirmation

| Constraint | Status |
|------------|--------|
| Nothing changed on VPS production | **YES** |
| Nothing deleted | **YES** |
| Railway services not deleted | **YES** |
| Railway variables not changed | **YES** |
| Hosted Supabase not deleted/changed | **YES** |
| `site.env` not changed | **YES** |
| Parser env not changed | **YES** |
| Docker/systemd/cron not changed | **YES** |
| No restart/deploy triggered | **YES** |
| Secrets not printed | **YES** |

---

## Deliverables

- Report: `reports/vps-migration/30-stage6c-post-cutover-monitoring-railway-2026-06-25.md`
- Reusable read-only script: `scripts/vps-migration/stage6c-post-cutover-monitoring.sh`
