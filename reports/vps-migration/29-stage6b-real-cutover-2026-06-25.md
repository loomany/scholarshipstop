# Stage 6B — Real Supabase → VPS cutover (execution attempt)

**Дата:** 2026-06-25
**VPS:** `213.155.22.74`
**Owner GO received:** `GO STAGE 6B REAL CUTOVER — APPROVED`
**Execution channel:** SSH `ubuntu@213.155.22.74` (key auth, passwordless sudo, tmux available).

## Verdict: **BLOCKED**

Real cutover **was NOT started**. Execution was halted at the **read-only preflight gate**, before
freezing parsers, before any dump, and before any production change. Per the owner's rule
("если любой критичный шаг FAIL — STOP и дай rollback recommendation"), a failed precondition is a
critical FAIL. The VPS does **not** currently match the Stage 5A/6A runbook: the mandatory DB
restore-validation pipeline is absent on the VPS, so the required "extended validation PASS" gate
**cannot be executed**, and a runbook-strict cutover is therefore not possible right now.

**No destructive or production-affecting action was performed.** Only read-only commands ran, plus
one read-only preflight script copied to `/tmp` and then deleted.

---

## Hard conditions — status at stop

| Condition | Status |
|-----------|--------|
| Freeze parsers first | **NOT REACHED** — parsers never touched |
| No dual-write | **HELD** — no writes redirected |
| Final dump only in tmux/screen | **NOT REACHED** — no dump taken |
| Production `site.env` switched only after validation PASS | **HELD** — site.env unchanged |
| Use `host-build-site.sh`, not `git pull` | **N/A** — no build run |
| Secrets/tokens/passwords/URI not printed | **HELD** — none printed |
| Stop on critical FAIL | **APPLIED** — stopped at preflight |

---

## Preflight results (read-only)

### PASS

| Check | Result |
|-------|--------|
| `https://scholarshiptop.com/` | 200 (verified earlier in Stage 6A) |
| `site.env` source | **HOSTED Supabase** (`*.supabase.co`) — correct backup target |
| `site.cutover-preview.env` | URL `…/supabase`, anon + service **legacy JWT present** |
| Root secret files | `/root/.supabase-db-url`, `/root/.supabase-legacy-anon-jwt`, `/root/.supabase-legacy-service-jwt` present |
| Dump script | `app/scripts/vps-migration/export-supabase-prod-dump.sh` present |
| Build script | `/opt/scholarshiptop/scripts/host-build-site.sh` present (different path than runbook) |
| Superuser restore | `/opt/scholarshiptop/scripts/restore-postgres-superuser.sh` present |
| Site smoke / deploy | `app/ops/vps/scripts/smoke-site.sh`, `deploy-site.sh` present |
| Auth smoke | `app/scripts/vps-migration/stage5c1-auth-smoke.mjs` present |
| Parser services | 3 active + enabled: `…-bigfuture`, `…-scholarship-america`, `…-simpler-grants-gov` |
| Parser env files | present; all target **HOSTED Supabase**; auth via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (so VPS retarget is feasible with existing legacy JWTs) |
| Parser timers/cron | **none** |
| Backups dirs | `${ROOT}/backups`, `/opt/scholarshiptop-db-backups` present |
| Swap | 4.0 GiB present |
| Disk | 57 GiB free on `/` |
| Self-host API stack | gotrue/postgrest/gateway + site + nginx containers up |

### BLOCKERS (FAIL)

| # | Blocker | Impact |
|---|---------|--------|
| **B1** | `validate-vps-db-restore-extended.sh` **absent everywhere on VPS** | The mandatory "extended validation PASS" gate cannot run. Without it, restore correctness before site switch is unverifiable. |
| **B2** | `restore-postgres-clean-test.sh` + its deps `restore-postgres-pre.sh`, `restore-postgres-post.sh` **absent on VPS** | The runbook clean-test restore step cannot run. VPS only has `restore-postgres-test.sh` (different script) + `restore-postgres-superuser.sh`. |
| **B3** | No prepared parser **VPS-target** env | Parser switch (Phase 8) has no prepared target. (Remediable in-place: backup + retarget 3 keys `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` to `…/supabase` + legacy JWTs — but not pre-prepared/approved.) |
| **B4** | `host-build-site.sh` lives at `/opt/scholarshiptop/scripts/`, not the runbook path `app/scripts/vps-migration/` | Runbook command path is wrong for this VPS; build script content not verified to match the committed version. |

### WARNINGS

| # | Warning |
|---|---------|
| W1 | RAM headroom low: `Mem available ≈ 376 MiB`, swap already `2.3 GiB used` of 4 GiB. Host `npm run build` (heap 1536 MiB) alongside the running self-host API stack risks OOM/slow build during the freeze window. |
| W2 | App dir is a **snapshot**, not a git checkout, and is **stale** vs the committed repo (missing scripts above). Confirms cutover must use snapshot build (no `git pull`) — but the snapshot must first be made complete. |
| W3 | `sb_publishable_*` → legacy JWT swap (expected; already mitigated by `site.cutover-preview.env`). |

---

## Why this is a STOP (not a "fix-and-fire")

The blocked items are the **DB restore + validation tooling** for a **real production cutover**.
Introducing/replacing restore + validation scripts on the VPS and then immediately firing a
destructive restore — during a parser-freeze window, with tight RAM — is exactly the kind of
improvisation that must have explicit owner sign-off. The runbook gate ("only switch `site.env`
after extended validation PASS") is unenforceable until that validation script is present and
confirmed. Proceeding would not be "строго по Stage 5A/6A runbook."

---

## Remediation to reach a re-GO (non-destructive)

These steps do **not** touch hosted Supabase, production `site.env`, or parsers:

1. **Sync the validated restore/validation pipeline** from the committed repo to the VPS app
   snapshot (so paths match the runbook):
   - `ops/vps/scripts/restore-postgres-clean-test.sh`
   - `ops/vps/scripts/restore-postgres-pre.sh`
   - `ops/vps/scripts/restore-postgres-post.sh`
   - `ops/vps/scripts/validate-vps-db-restore-extended.sh`
   - `scripts/vps-migration/host-build-site.sh` (confirm matches committed version)
2. **Dry-validate the current VPS prod DB** with `validate-vps-db-restore-extended.sh` (read-only)
   to confirm the script runs and baseline counts match (expected `public.scholarships=21110`).
3. **Pre-stage parser VPS-target envs**: for each of the 3 active parser env files, prepare a
   backup + a retargeted copy (`SUPABASE_URL=https://scholarshiptop.com/supabase`, anon/service =
   legacy JWTs). Owner approves the retarget approach.
4. **Confirm RAM plan** for the build window (accept swap-backed build, or briefly add RAM).
5. Owner re-issues GO; cutover then runs the full freeze → dump → sha256 → clean-test →
   superuser-restore → extended-validation → site switch → smoke → parser switch sequence.

---

## Final report fields

| Field | Value |
|-------|-------|
| **Verdict** | **BLOCKED** |
| **Actual downtime** | **0 min** — production never taken down |
| **Freeze duration** | **0 min** — parsers never frozen |
| **Dump / restore / validation** | **Not performed** — blocked by absent validation pipeline (B1/B2) |
| **Site smoke** | **Not performed** |
| **Auth smoke** | **Not performed** |
| **Parser switch result** | **Not performed** — parsers untouched, still on hosted Supabase |
| **Hosted Supabase writes stopped?** | **No** — parsers still writing to hosted Supabase |
| **Rollback window status** | **Not applicable** — no change made, nothing to roll back |
| **Supabase keep active 7 days** | **Confirmed** — hosted Supabase untouched and retained (≥ 7 days) |

---

## State confirmation (post-stop, verified read-only)

- Parsers: `bigfuture=active`, `scholarship-america=active`, `simpler-grants-gov=active` — **unchanged**.
- `site.env`: still `HOSTED_SUPABASE` — **unchanged**.
- Hosted Supabase: **not modified, not deleted**.
- No dump file created; no `site.env` backup created; no containers rebuilt/restarted.

---

## Rollback recommendation

**None required.** No production-affecting action was taken (preflight is read-only). Current state
is identical to pre-Stage-6B: production on hosted Supabase, parsers active on hosted Supabase,
self-host API stack standing by at `https://scholarshiptop.com/supabase`.

---

## STOP

Real cutover halted at preflight. Awaiting non-destructive remediation (sync restore/validation
pipeline + pre-stage parser VPS envs) and a fresh owner GO before re-attempting Stage 6B.
