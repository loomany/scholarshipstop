# Repo / deploy safety audit — Railway worker (2026-05-24)

**Updated:** 2026-05-24 ~21:43 UTC (lock verification pass)

## Executive summary

| Question | Answer |
|----------|--------|
| Repo code pushed? | **Yes** — `main` = `origin/main` @ `3d8cd26` |
| Local worker running? | **No** |
| External worker active? | **Likely yes** — wave 185 rows growing in DB |
| Lock held? | **Yes** — legitimate (active run) |
| Lock `run_id` | `091052b8-ba2c-4e7b-b9b5-2bbf5fd28625` |
| Latest completed wave | **184** (+150 scholarships) |
| Wave in progress | **185** (partial at audit time) |
| Live sitemap ES/FR | **11101 / 11101** |
| Next safe start wave | **186** (after 185 finishes + lock released) |
| Safe to work on site? | **Yes**, avoid autopilot/schema paths |

---

## Step 1 — Worker / lock verification

### `npm run i18n:scholarship-autopilot:status`

Completed (~277s). Notable output:

```json
{
  "sitemapIndex": 200,
  "liveEs": 11101,
  "liveFr": 11101,
  "eligibleEs": 11101,
  "eligibleFr": 0,
  "latestRelaxedWave": 27,
  "advisoryLockHeld": null,
  "lockMessage": "TypeError: fetch failed",
  "badSitemapContent": false
}
```

**Caveats:** `eligibleFr: 0` and `latestRelaxedWave: 27` are transient/script bugs (same class as prior audits). Live sitemap XML and DB are authoritative. Lock RPC failed over HTTP in this run; DB query below confirms lock state.

### DB lock row (read-only SQL)

| Field | Value |
|-------|--------|
| `run_id` | `091052b8-ba2c-4e7b-b9b5-2bbf5fd28625` |
| `locked_at` | 2026-05-24 21:24:41 UTC |
| `expires_at` | 2026-05-25 09:24:41 UTC |
| `i18n_scholarship_autopilot_is_locked()` | **true** |

**Not** the local wave-182 run (`db39d78c-d4dc-46af-abc1-783cb4bf27cd`, finished 21:21 UTC, lock released).

### DB waves (relaxed machine_model)

| Wave | Rows (es+fr) | Notes |
|------|----------------|-------|
| 182 | 100 | Local run — ACCEPTED (+50 scholarships) |
| 183 | 300 | External (+150) |
| 184 | 300 | External (+150) |
| **185** | **256+** (growing) | **In progress** at audit time |

Wave 185 row count increased **36 → 256** within ~1 minute during this audit → **active writer**.

### Local processes

No local `run-railway-worker` / `run-relaxed-autopilot` process. Stale `node` PIDs from 2026-05-23 only (unrelated dev servers).

### Railway dashboard

**Not verified** — `railway login` required (`invalid_grant`). User must confirm in Railway UI that `scholarship-i18n-worker` deployment is **Running** and logs show wave 183–185.

### Lock assessment

| Scenario | Verdict |
|----------|---------|
| Lock held + wave 185 rows still increasing | **Legitimate — do not unlock** |
| Lock held + no DB activity + no Railway job | Orphan — see unlock procedure below |

**Action now:** **Wait.** Do not start another worker. Do not clear lock while wave 185 is writing.

### Safe unlock (only if confirmed orphan)

After Railway shows **no running deployment** and wave 185 row count is **stable** for several minutes:

```powershell
# Preferred: release by run_id via existing RPC wrapper
npx tsx scripts/i18n/scholarship-detail-autopilot/test-scholarship-autopilot-lock.ts
# (test script only for empty lock — for production orphan use release helper)

# Or service-role RPC (same code path as worker exit):
# i18n_scholarship_autopilot_unlock_run('091052b8-ba2c-4e7b-b9b5-2bbf5fd28625')

# Last resort SQL (service role only, no worker running):
# delete from public.i18n_scholarship_worker_lock
# where lock_key = 'scholarship_detail_autopilot';
```

Do **not** run unlock until Railway dashboard confirms the job is stopped/failed.

---

## Step 2 — Git classification

### A — Safe to commit (this pass)

- `reports/seo/repo-worker-safety-audit-2026-05-24.md` (this file)

### B — Do not commit

- `.env.local.bak-*`, `.env.local.prod-backup`, `.cursor/settings.json`
- Large run logs (`*.txt` wave logs, 12hour logs)
- Stage 6 content drafts (`data/content/**`, `lib/content-hub/*Stage6*`)
- Hundreds of untracked SEO wave CSVs/checkpoints
- `reports/cloudflare/`

### C — Need review / leave unstaged

- 4 modified old Stage 5E-6 baseline/handoff MD files (unrelated noise)
- Untracked source outside reports: `lib/content-hub/hotfixAiResourceLiveBodies.ts`, polish scripts — **not pushed, not part of worker**

---

## Step 3 — Commit decision

**Committed:** audit report only (`chore(seo): record worker safety audit`).  
**Not committed:** logs, Stage 6 WIP, modified legacy MD files.

---

## Production (read-only)

| Check | Result |
|-------|--------|
| ES detail sitemap | **200**, **11101** `<loc>` |
| FR detail sitemap | **200**, **11101** `<loc>` |
| `/sitemap.xml` | **200** |
| `badSitemapContent` | **false** |

---

## Safe site work while worker runs

**Yes**, if you avoid:

- `run-relaxed-autopilot.ts`, selectors, Railway worker scripts
- `content_translations` schema/policy/migrations
- Scholarship detail sitemap builder
- Starting local or second Railway autopilot
- Worker env vars (`SUPABASE_SERVICE_ROLE_KEY`, `I18N_*` worker vars)
- Auth/payment/Lemon changes

**Safe:** UI, copy, llms, SEO pages, read-only audits, non-DB planning.

---

## Timeline (local vs external)

| Time (UTC) | Event |
|------------|--------|
| 20:42–20:58 | Local Railway-path test wave **181** (`dcf91377-...`) |
| 21:05–21:21 | Local wave **182** (`db39d78c-...`) — exit 0, lock released |
| 21:24 | New lock `091052b8-...` acquired (external worker) |
| 21:36+ | Waves **183**, **184** complete in DB; **185** in progress |
| 21:43 | Sitemap **11101/11101**; wave 185 rows still increasing |

---

## Recommended next actions

1. Check **Railway dashboard** for `scholarship-i18n-worker` — confirm wave 185 in logs.
2. **Wait** for job completion; verify lock released (`i18n:scholarship-autopilot:status` or DB).
3. If job failed mid-wave-185 with lock stuck → use orphan unlock procedure above.
4. Next autopilot start wave after clean finish: **186**.
5. Continue normal site work on non-autopilot paths.
