# Stage 5E-17 — Railway worker repeat `startWave=183` audit (2026-05-24 / 2026-05-25)

## Executive answers

| Question | Answer |
|----------|--------|
| **Worker stopped?** | **Likely yes** (lock not held, no local worker). **Railway UI not verified** — CLI token expired (`invalid_grant`). **You must confirm** `scholarship-i18n-worker` is paused/stopped in dashboard. |
| **Lock held?** | **No** — `i18n_scholarship_autopilot_is_locked()` = false, lock row absent. |
| **ES / FR sitemap count** | **13051 / 13051** (live XML, 2026-05-25 ~17:12 UTC) |
| **Valid latest wave (clean accounting)** | **187** (150 scholarships, 300 rows, published, balanced ES/FR) |
| **Next safe start wave** | **188** (`I18N_WORKER_START_WAVE=188` after deploy of guards below) |
| **Rollback needed?** | **No** — pages are published, routes/sitemap healthy, no `/en` in detail sitemaps, unseeded ES/FR return 404. Wave **183** is **reporting-polluted**, not a public breakage. |
| **Root cause of repeat 183** | Railway **restarted the worker service** after **non-zero exit** (DB verify `1000 != 300`) while env kept **`I18N_WORKER_START_WAVE=183`**. Lock is **released on exit**, so each new container re-acquired lock and re-ran wave 183, appending rows under the same `machine_model`. |

---

## Task 1 — Stop Railway worker (manual)

`railway login` is **not valid** in this environment. **Operator action required:**

1. Open Railway project → service **`scholarship-i18n-worker`** only (not main Site).
2. If deployment status is **Running**, **Building**, or **Restarting** → **Stop / Pause / Cancel** deployment.
3. Confirm **no new logs** with `[worker] config` and `startWave: 183`.
4. Optional: set service to **manual deploy** / disable auto-deploy until next approved run.
5. Set **restart policy** to **Never** (or use one-off job) — see Task 4.

**Do not** clear DB lock while a container might still be running. At audit time lock was already clear.

---

## Task 2 — Read-only production audit (after stop)

Audit time: **2026-05-25T17:07–17:12 UTC**. Commands: `npm run i18n:scholarship-autopilot:status`, `npm run i18n:scholarship-autopilot:audit-repeat`, `audit-waves-181-plus.ts`.

### 1. Lock

| Field | Value |
|-------|--------|
| `i18n_scholarship_autopilot_is_locked()` | **false** |
| Lock row (`i18n_scholarship_worker_lock`) | **none** |
| `run_id` / `expires_at` | n/a |
| Railway worker running | **Not confirmed** (dashboard); lock suggests **no active worker** |

### 2. Sitemap

| Check | Result |
|-------|--------|
| ES detail `<loc>` count | **13051** |
| FR detail `<loc>` count | **13051** |
| `/en/` in detail sitemaps | **No** |
| `/draft/` path segment | **No** |
| `review_required` | **No** |
| Eligible ES/FR (DB list helper) | **13051 / 13051** |

Note: naive `draft` substring match in slug/title is a **false positive**; checks now use `/draft/` path only.

### 3. DB — relaxed waves 181+ (`content_translations`)

| Wave | Rows | ES | FR | Scholarships | Published | Accepted |
|------|------|----|----|--------------|-----------|----------|
| 181 | 100 | 50 | 50 | 50 | 100 | yes |
| 182 | 100 | 50 | 50 | 50 | 100 | yes |
| **183** | **1000** | **500** | **500** | **504** | 1000 | **no** (over-counted) |
| 184 | 300 | 150 | 150 | 150 | 300 | yes |
| 185 | 300 | 150 | 150 | 150 | 300 | yes |
| 186 | 300 | 150 | 150 | 150 | 300 | yes |
| 187 | 300 | 150 | 150 | 150 | 300 | yes |

Wave **183** detail:

- **504 distinct `source_id`** under `stage5e-scholarship-autopilot-relaxed-wave-183`
- **No duplicate ES/FR rows per source_id** (0 duplicate locale rows)
- **496** sources have both locales; **4** ES-only + **4** FR-only (partial pairs from interrupted reruns)
- All rows **published**, quality ≥ 85, titles/bodies present
- Failure mode: **multiple Railway restarts** tagged many net-new scholarships with the **same wave number**, so `verifyDbWave` expected **300** rows (150×2) but saw **1000**

### 4. Routes

| Check | Result |
|-------|--------|
| Unseeded ES `/es/becas/zzzz-nonexistent-...` | **404** |
| Unseeded FR `/fr/bourses/zzzz-nonexistent-...` | **404** |
| Wave 187 sample | Not re-run (slow); prior smoke path uses production base URL |

---

## Task 3 — Actual outcome

### Valid / accepted waves (for resume)

- **181, 182** — 50 scholarships each (early Railway / local runs)
- **184–187** — 150 scholarships each (clean)
- **Not accepted as a single wave:** **183** (machine_model bucket has ~3.4× expected volume)

### Sitemap / net-new

| Baseline | Count | Notes |
|----------|-------|-------|
| Pre–5E-17 prod (first Railway log) | 10701 / 10701 | `i18n-stage5e-17-railway-worker-first-prod-run-log` |
| User-reported post-run | 12751 / 12751 | Before repeat-183 restarts |
| User-reported after one 183 attempt | 12901 / 12901 | +150 per locale |
| **Audit (now)** | **13051 / 13051** | +300 vs 12901 → consistent with **184–187** style waves completing |

**Net-new scholarships (sitemap, vs 10701):** **2350** per locale (`13051 - 10701`).

**Tagged under waves 181–187 (scholarship counts):** 50 + 50 + 504 + 600 = **1204** distinct scholarships in machine_model buckets (183 overweight).

### Wave 183 — valid content, bad wave label

- Public content is **valid published** ES/FR; **do not rollback** solely because DB verify failed.
- **machine_model wave-183 is polluted** for ops/rollback boundaries — treat as **frozen**; do not rerun 183 without `I18N_WORKER_FORCE_START_WAVE=1` and a deliberate remediation plan.

### Rollback?

**No**, unless you need strict wave-level rollback for analytics. No evidence of English fallback, broken sitemap, or draft/review URLs in detail sitemaps.

---

## Task 4 — Why Railway restarted

| Hypothesis | Evidence |
|------------|----------|
| **Auto-restart after non-zero exit** | **Most likely.** `run-railway-worker.ts` calls `process.exit(exitCode)` with child **exit 1** on DB verify failure; lock released in `finally`. New container → same env → wave 183 again. |
| **Manual redeploys** | Possible but logs pattern (same `startWave=183`, `target=1000`, `waveSize=150`) fits **restart loop** |
| **Long-running service policy** | Plan said one-shot; if service uses default **ON_FAILURE** / **always restart**, job behaves like a daemon |
| **Auto-deploy** | Unknown without dashboard; repeated identical config suggests **restart** not redeploy |
| **Cron overlap** | Unlikely; lease lock would block second runner (when held) |

**Recommended Railway config before next run:**

- **Restart policy: Never** (or Railway one-off / `railway run` manual execution)
- **Auto-deploy: off** until explicit approval
- After code deploy: set `I18N_WORKER_START_WAVE=188`, do **not** leave 183 in env
- Optional: `I18N_WORKER_LOCK_EXIT_ZERO_ON_HELD=1` only helps lock contention, not verify failures

---

## Task 5 — Code / config fixes (implemented in repo)

| Change | File |
|--------|------|
| Abort if `startWave` already has relaxed rows (unless force) | `worker-start-wave-guard.ts`, `run-railway-worker.ts` |
| Abort if `startWave` < computed next safe wave | `run-railway-worker.ts` |
| `I18N_WORKER_FORCE_START_WAVE=1` for intentional reruns | `worker-config.ts` |
| Per-wave `suggestNextSafeStartWave` / `findLatestAcceptedRelaxedWave` (no 1k row cap bug) | `worker-start-wave-guard.ts` |
| Lock row `run_id` / `expires_at` in status | `scholarship-autopilot-lock.ts`, `railway-worker-status.ts` |
| Read-only audit script | `audit-railway-repeat-startwave.ts`, `npm run i18n:scholarship-autopilot:audit-repeat` |
| Sitemap false positive `draft` → `/draft/` only | `audit-railway-repeat-startwave.ts`, `railway-worker-status.ts` |

**Before next Railway run:**

1. Pause worker (Task 1).
2. Deploy commit with guards to `main` and Railway worker service.
3. Set `I18N_WORKER_START_WAVE=188`, `I18N_WORKER_TARGET` = remaining goal, keep `I18N_WORKER_WAVE_SIZE=150` if desired.
4. Confirm restart policy **Never** + manual trigger only.
5. Do **not** set `I18N_WORKER_FORCE_START_WAVE=1` unless intentionally reprocessing a wave.

---

## Task 6 — Incident timeline (from user logs + DB)

1. Worker completed a run → sitemap **12751/12751**, lock released.
2. Railway started **new container**, same **`startWave=183`**, acquired lock.
3. Wave 183 published **+150** sitemap (`12751→12901`) but **DB verify failed** (`1000 != 300`, `es=500 fr=500`) — accumulated rows from prior 183 attempts.
4. Process exited **non-zero** → Railway restarted → repeat.
5. Later env/run advanced **184–187** (clean 150 each); sitemap now **13051**.

---

## Commands for re-check

```bash
npm run i18n:scholarship-autopilot:status
npm run i18n:scholarship-autopilot:audit-repeat
npx tsx scripts/i18n/scholarship-detail-autopilot/audit-waves-181-plus.ts
```

---

## Final checklist

- [ ] Railway `scholarship-i18n-worker` **stopped** in UI (operator)
- [x] Lock **not held** (safe to plan next run; still confirm no Railway container)
- [x] Sitemap **13051/13051**, no `/en` detail pollution
- [x] Next run **`I18N_WORKER_START_WAVE=188`** after guard deploy
- [x] **No rollback** required for public site health
- [x] Guard code pushed to `main` — commit **`4fb3eb6`**
- [ ] Railway worker service redeployed from `main` @ `4fb3eb6` (manual; CLI unauthorized)
- [ ] Railway auto-deploy **OFF**, restart policy **Never**, public domain **OFF**
- [ ] Railway env updated (see below); **do not** set `I18N_WORKER_FORCE_START_WAVE=1`

## Wave 188+ deploy (2026-05-25)

**Guard commit:** `4fb3eb6` on `main`

**Pre-run status (local):**

```json
{
  "liveEs": 13051,
  "liveFr": 13051,
  "advisoryLockHeld": false,
  "nextSafeStartWave": 188,
  "badSitemapContent": false
}
```

**Railway variables (set before manual run):**

```
I18N_WORKER_START_WAVE=188
I18N_WORKER_TARGET=900
I18N_WORKER_WAVE_SIZE=150
I18N_WORKER_MAX_RUNTIME_MINUTES=600
I18N_WORKER_REQUIRE_LOCK=1
```

**Expected:** waves 188–193, sitemap 13051 → 13951, exit 0, lock released.

**Stop run if:** same wave restarts, DB verify mismatch, lock stuck, sitemap delta wrong, `/en`/draft/review/English fallback.
