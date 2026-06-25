# Stage 6B — Pre-cutover remediation readiness (non-destructive)

**Дата:** 2026-06-25
**VPS:** `213.155.22.74`
**Scope:** Non-destructive remediation of the Stage 6B preflight blockers (report 29). **No real cutover, no freeze, no dump, no restore over prod DB, no production change.**

## Verdict: **PASS_WITH_WARNINGS — READY_FOR_RE_GO**

All Stage 6B blockers (B1, B2, B4) are resolved and the parser switch (B3) is pre-staged. The
self-host restore/validation pipeline is now present on the VPS at the runbook paths, the extended
validation **passes** against the current VPS prod DB (all 14 baseline counts exact,
`scholarships=21110`), and VPS-target parser env files are pre-staged without touching active envs.
The only remaining warning is **RAM headroom** for the host build (recommend adding swap before the
build window).

**Production site, `site.env`, parsers, and hosted Supabase were NOT changed.**

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Real cutover not executed | **PASS** |
| Parsers not stopped | **PASS** — all 3 still `active` |
| Production `site.env` not changed | **PASS** |
| Production site not rebuilt/restarted for switch | **PASS** |
| Hosted Supabase not changed | **PASS** |
| No final dump | **PASS** |
| No restore over production VPS DB | **PASS** — only read-only validation ran |
| No dual-write | **PASS** |
| No secrets/tokens/URIs printed | **PASS** |
| No env/secrets/dumps committed | **PASS** — `.next-cutover` envs live on VPS only |

---

## 1. Synced restore/validation scripts (B1, B2 resolved)

Installed from the committed repo into the VPS app snapshot (CRLF→LF normalized, `bash -n` OK):

| Script | Installed path | Mode |
|--------|----------------|------|
| `restore-postgres-clean-test.sh` | `/opt/scholarshiptop/app/ops/vps/scripts/` | 755 |
| `restore-postgres-pre.sh` | `/opt/scholarshiptop/app/ops/vps/scripts/` | 755 |
| `restore-postgres-post.sh` | `/opt/scholarshiptop/app/ops/vps/scripts/` | 755 |
| `restore-postgres-superuser.sh` (re-synced so deps colocate) | `/opt/scholarshiptop/app/ops/vps/scripts/` | 755 |
| `validate-vps-db-restore-extended.sh` | `/opt/scholarshiptop/app/ops/vps/scripts/` | 755 |
| `create-seo-hub-content-vps.sql` (dep of post-restore) | `/opt/scholarshiptop/app/ops/vps/scripts/` | 644 |

Dependency chain confirmed satisfied: `clean-test` → `pre` + `post` + `validate-extended`;
`post` → `create-seo-hub-content-vps.sql`; `superuser` → `pre` + `post`. All colocated in one dir
so each script's `SCRIPT_DIR` resolution works.

All 6 syntax-check OK (`bash -n`).

---

## 2. Actual `host-build-site.sh` path (B4 resolved)

| Item | Result |
|------|--------|
| Canonical VPS path | `/opt/scholarshiptop/scripts/host-build-site.sh` |
| Content vs committed repo | **identical** (SHA256 `1a5597b2…a2456` matches `scripts/vps-migration/host-build-site.sh`) |
| Runbook path alignment | copy also installed at `/opt/scholarshiptop/app/scripts/vps-migration/host-build-site.sh` so both the runbook command and the canonical path are valid |

Cutover should invoke either path; both now exist and are byte-identical to the committed version.
It performs a **host npm build + `docker compose up -d site nginx`** (snapshot build) — **not** a `git pull`.

---

## 3. Extended validation dry-run (read-only, current VPS prod DB `scholarshiptop_prod`)

`RESTORE_VALIDATION_PASS`. No writes performed.

| Table | Expected | Actual |
|-------|----------|--------|
| auth.users | 555 | **555** |
| auth.identities | 566 | **566** |
| public.profiles | 550 | **550** |
| public.subscriptions | 4 | **4** |
| public.scholarships | 21110 | **21110** |
| public.providers | 6385 | **6385** |
| public.content_posts | 953 | **953** |
| public.content_translations | 34998 | **34998** |
| public.essays | 11790 | **11790** |
| public.google_indexing_queue | 33756 | **33756** |
| storage.objects | 5353 | **5353** |
| public.seo_hub_content | 919 | **919** |
| public.compare_pages | 179 | **179** |
| public.state_compare_pages | 1275 | **1275** |

Extensions: `pg_trgm, pgcrypto, plpgsql, unaccent, uuid-ossp`. RLS policies: 49. Triggers: 42.
DB size: 776 MB.

> Note: this validates the **current** VPS prod DB snapshot (restored at Stage 5C.1). The real
> cutover will re-run this same validation against a **fresh** final dump before any site switch.

---

## 4. Parser VPS-target env pre-stage (B3 pre-staged)

For each of the 3 active parser services (auth model: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`):

| Parser | Backup (active env, unchanged) | Prepared target |
|--------|-------------------------------|-----------------|
| bigfuture | `…/backups/parser-env.bigfuture.pre-cutover.20260625T173059Z` | `…/env/bigfuture.next-cutover.env` |
| scholarship-america | `…/backups/parser-env.scholarship-america.pre-cutover.20260625T173059Z` | `…/env/scholarship-america.next-cutover.env` |
| simpler-grants-gov | `…/backups/parser-env.simpler-grants-gov.pre-cutover.20260625T173059Z` | `…/env/simpler-grants-gov.next-cutover.env` |

Each `.next-cutover.env`:
- `SUPABASE_URL=https://scholarshiptop.com/supabase`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` legacy anon JWT (present, not printed)
- `SUPABASE_SERVICE_ROLE_KEY=` legacy service JWT (present, not printed)
- all other parser-specific keys carried over verbatim from the active env

Verification:
- Active env files **byte-identical before/after** (SHA256 unchanged) — not replaced.
- Parser services **not restarted**: `bigfuture=active`, `scholarship-america=active`, `simpler-grants-gov=active`.
- `.next-cutover.env` files use distinct names (not the unit's `EnvironmentFile`), so they are inert until the cutover installs them.

At cutover, switching is: `cp active→backup` (already done) then `install -m 600 <name>.next-cutover.env <name>.env` + `systemctl restart`, one parser at a time after site PASS.

---

## 5. RAM / swap plan

| Metric | Value |
|--------|-------|
| Mem total | 3.8 GiB |
| Mem available | ~349 MiB |
| Swap total | 4.0 GiB |
| Swap free | ~1.2 GiB (2.8 GiB used) |
| Load (1/5/15m) | 0.63 / 0.65 / 0.75 (low) |
| Disk free `/` | 57 GiB |
| Largest user | `scholarshiptop-site` container ~1.67 GiB |

**Assessment:** the host build runs `npm run build` with heap up to **1536 MiB** while the **old site
container (~1.67 GiB) stays running**. Available RAM (~349 MiB) + free swap (~1.2 GiB) ≈ **1.5 GiB**,
which is **below** the build heap — real OOM/slow-build risk.

**Recommendation (PASS_WITH_WARNINGS):** cutover **can** proceed with a swap-backed build, but
before the build window do **one** of:

1. **Add swap** (preferred, non-destructive, ~1 min): create an extra 4 GiB swapfile → 8 GiB total, giving ~5 GiB free swap headroom; remove after cutover if desired. **OR**
2. **Stop the old site container immediately before** the host `npm run build` to free ~1.7 GiB RAM (accepts a few extra minutes of the already-planned downtime; `host-build-site.sh` recreates the site afterward).

Option 1 is recommended because it keeps the site up during build and removes OOM risk.

---

## Final output

| Field | Value |
|-------|-------|
| **Verdict** | **PASS_WITH_WARNINGS — READY_FOR_RE_GO** |
| **Missing scripts synced** | `restore-postgres-clean-test.sh`, `restore-postgres-pre.sh`, `restore-postgres-post.sh`, `restore-postgres-superuser.sh`, `validate-vps-db-restore-extended.sh`, `create-seo-hub-content-vps.sql` (+ `host-build-site.sh` copy at runbook path) |
| **validate-vps-db-restore-extended result** | `RESTORE_VALIDATION_PASS` — all 14 baselines exact, `scholarships=21110` |
| **Parser env pre-stage result** | 3 backups + 3 `.next-cutover.env` created; active envs unchanged; services not restarted |
| **Actual host-build-site.sh path** | `/opt/scholarshiptop/scripts/host-build-site.sh` (identical to repo; copy also at `app/scripts/vps-migration/`) |
| **RAM/swap status** | 3.8 GiB RAM (~349 MiB free), 4 GiB swap (~1.2 GiB free), load 0.63 — **add swap before build** |
| **Production / site.env / parsers / hosted Supabase** | **unchanged** |
| **Commit hash** | `d311947` |

---

## Remaining warning before re-GO

- ~~**RAM headroom**: add ~4 GiB swap (or stop the old site container during host build).~~
  **RESOLVED** — see swap remediation below. All blockers resolved.

---

## RAM remediation applied (2026-06-25, non-destructive)

Added a second persistent 4 GiB swapfile `/swapfile2` (`mkswap` + `swapon` + fstab entry).
No production/site.env/parser/hosted-Supabase change; no dump/restore.

| Metric | Before | After |
|--------|--------|-------|
| Swap total | 4.0 GiB | **8.0 GiB** (`/swapfile` 4G + `/swapfile2` 4G) |
| Swap free | ~1.2 GiB | **~5.1 GiB** |
| Mem available | ~349 MiB | ~337 MiB |
| Disk free `/` | 57 GiB | 53 GiB |
| Load (1/5/15m) | 0.63/0.65/0.75 | 0.36/0.41/0.60 |
| fstab persistence | `/swapfile` | `/swapfile` + **`/swapfile2`** |

Free swap (~5.1 GiB) now exceeds the 1536 MiB build heap → OOM risk removed.

Post-remediation confirmation: production `/`=200, `/sitemap.xml`=200; `site.env`=HOSTED_SUPABASE
(unchanged); all 3 parsers `active`; hosted Supabase untouched.

**Verdict after remediation:** `SWAP_READY_FOR_CUTOVER`.

## What the real cutover (re-GO) will run

freeze parsers → final dump (tmux) → sha256 → `restore-postgres-clean-test.sh` (validation incl.
`validate-vps-db-restore-extended.sh`) → `restore-postgres-superuser.sh` into `scholarshiptop_prod`
→ `validate-vps-db-restore-extended.sh` → backup `site.env` → install `site.cutover-preview.env` →
`host-build-site.sh` → site + auth smoke (GATE, rollback by T+45) → parser switch one-by-one using
the pre-staged `.next-cutover.env` files.

**Re-GO phrase:** `GO STAGE 6B REAL CUTOVER — APPROVED` (with swap recommendation acknowledged).
