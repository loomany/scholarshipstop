# Stage 6A — Final live cutover preflight and approval gate

**Дата:** 2026-06-25
**VPS:** `213.155.22.74`
**Scope:** Pre-cutover readiness verification + exact downtime plan. **No real cutover executed.**
**Predecessor:** Stage 5C.1 (`STAGE_5C1_JWT_ALIGNMENT_READY_PASS_WITH_WARNINGS`, commit `463e788`).

## Verdict: **READY_FOR_OWNER_GO_REAL_CUTOVER — PASS_WITH_WARNINGS**

All public-facing readiness checks pass from an external client. The remaining keyed/VPS-side
checks (REST counts, anon/service RLS, RPC, auth flow, parser inventory, resources) are wired into
a single **read-only** preflight script to be run on the VPS:
`scripts/vps-migration/stage6a-final-preflight.sh`. The only outstanding warning is the known,
expected `sb_publishable_*` → legacy-JWT key swap required in `site.env` at the cutover window
(carried over from Stage 5C.1, already mitigated by the prepared `site.cutover-preview.env`).

**Real cutover NOT executed. Production, hosted Supabase, and parsers all unchanged.**

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production `site.env` not changed | **PASS** |
| Production site not rebuilt/restarted/switched | **PASS** |
| Parsers not switched | **PASS** |
| Parsers not stopped (await GO) | **PASS** |
| Hosted Supabase not modified | **PASS** |
| No final dump/restore | **PASS** |
| No dual-write | **PASS** |
| No secrets/tokens/passwords/URIs printed | **PASS** |
| No env/secrets/dumps committed | **PASS** |
| Supabase not deleted | **PASS** |
| Storage migration not done | **PASS** |

---

## 1. Git / repo state

| Check | Result |
|-------|--------|
| Latest commits visible | **PASS** — HEAD `7a6d4bf` → `463e788` (Stage 5C.1) |
| No secrets staged | **PASS** — staging area empty; no `.env`/dump/secret files staged |
| Reports 12–27 exist | **PASS** — all present in `reports/vps-migration/` |
| App dir is snapshot deploy | **CONFIRMED** — cutover uses `host-build-site.sh` (host build + `docker compose ... up site nginx`), **not** `git pull` |

Recent commits:

```
7a6d4bf docs: stage 5c1 report commit hash
463e788 Stage 5C.1: JWT alignment Option B for gateway cutover
d90a424 docs: stage 5c report commit hash
88d0cf7 Stage 5C: production no-basic-auth Supabase API route
a71172f docs: stage 5b report commit hash
```

Note: working tree has unrelated modified/untracked ops/seo files and deleted `services/content-hub/dist/*`
artifacts. None are secrets. Stage 6A commits **only** this report + the preflight script.

---

## 2. Production smoke (verified live, external client)

| Check | Result |
|-------|--------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |
| scholarship detail #1 (UPA / Wollongong) | **200** |
| scholarship detail #2 (Rugby League / Hull) | **200** |
| scholarship detail #3 (Pasifika / Victoria Wellington) | **200** |
| `site.env` still hosted Supabase | **VPS-side check** (preflight §2; Stage 5C.1 confirmed hosted `*.supabase.co`) |
| Logs have no `/supabase` calls from prod app | **VPS-side check** (preflight §2) |

---

## 3. Self-host API smoke (`https://scholarshiptop.com/supabase`)

| Check | Result |
|-------|--------|
| `/supabase/health` | **200** (verified live) |
| `/supabase/auth/v1/health` | **200** (verified live) |
| CORS from `https://scholarshiptop.com` | **PASS** — `204` + `Access-Control-Allow-Origin: https://scholarshiptop.com` (verified live) |
| Foreign origin not echoed | **PASS** — `204`, no `Access-Control-Allow-Origin` for `evil-foreign-origin.example` (verified live) |
| `/supabase/storage/v1/*` | **503** hybrid — hosted Supabase Storage retained (verified live) |
| `scholarships_safe_listing` count ≈ 21110 | **VPS-side keyed check** (preflight §3; Stage 5C.1 = 21110) |
| anon `profiles` → `[]` | **VPS-side keyed check** (preflight §3; Stage 5C.1 PASS) |
| service_role `profiles` → ≥1 | **VPS-side keyed check** (preflight §3; Stage 5C.1 PASS) |
| RPC `get_comparison_data` → 200 | **VPS-side keyed check** (preflight §3; Stage 5C.1 PASS) |

Keyed checks require the legacy JWT files (`/root/.supabase-legacy-anon-jwt`,
`/root/.supabase-legacy-service-jwt`) which never leave the VPS and are never printed. The preflight
script reads them into shell variables and uses them only as `curl` headers.

---

## 4. Auth smoke (safe, cutover-preview env)

Wired into preflight §4. Uses `/opt/scholarshiptop/env/site.cutover-preview.env` (NOT production
`site.env`) and the existing `scripts/vps-migration/stage5c1-auth-smoke.mjs`:

| Flow | Plan |
|------|------|
| signUp / signIn / getUser / refreshSession / logout | run against VPS DB via cutover-preview env |
| cleanup test user | mandatory |
| counts before/after (`auth.users`, `auth.identities`, `public.profiles`) | must be **unchanged** after cleanup |

Stage 5C.1 already ran this flow with verdict `STAGE_5C1_AUTH_PASS` (test user cleaned up). Preflight
§4 re-runs it and prints before/after counts to prove no residue.

---

## 5. Parser freeze inventory

Exact active parser services + env files (frozen for cutover):

| Service | Env file |
|---------|----------|
| `scholarshiptop-parser-bigfuture.service` | `/opt/scholarshiptop-parsers/env/bigfuture.env` |
| `scholarshiptop-parser-scholarship-america.service` | `/opt/scholarshiptop-parsers/env/scholarship-america.env` |
| `scholarshiptop-parser-simpler-grants-gov.service` | `/opt/scholarshiptop-parsers/env/simpler-grants-gov.env` |

| Check | Plan |
|-------|------|
| 3 services present + active/enabled state | preflight §5 (`systemctl is-active/is-enabled`) |
| 3 env files present | preflight §5 |
| No parser cron timers | preflight §5 (`systemctl list-timers` + `crontab -l` filtered) |

**No parser was stopped or modified in Stage 6A.**

---

## 6. VPS resources

Wired into preflight §6 (read-only):

| Check | Plan / threshold |
|-------|------------------|
| `free -h` | report RAM headroom |
| `swapon --show` | confirm swap device |
| `df -h` | `/`, `/opt/scholarshiptop`, `/opt/scholarshiptop-db-backups` |
| `uptime` | load |
| `docker ps` | site/nginx/gotrue/postgrest/gateway running |
| **4 GiB swap exists** | `SwapTotal` from `/proc/meminfo` ≥ 4 GiB → PASS, else WARN |
| disk enough for dump+restore | ≥ 20 GiB free on db-backups → PASS, else WARN |

---

## 7. Final cutover command plan (PREPARE ONLY — DO NOT RUN)

Full ordered plan with placeholders only (`<TS>`, `<DUMP>`, `<PARSER_ENV>`) is printed by
preflight §7. Summary:

1. `tmux new -s supabase-cutover`
2. Freeze parsers (stop the 3 services).
3. Final fresh dump in tmux (`SUPABASE_DB_URL_FILE=/root/.supabase-db-url` → `export-supabase-prod-dump.sh`).
4. `sha256sum -c <DUMP>.sha256`.
5. Restore clean-test (`restore-postgres-clean-test.sh`).
6. Restore superuser into VPS prod DB (`restore-postgres-superuser.sh`).
7. Extended validation (`validate-vps-db-restore-extended.sh`).
8. Backup `site.env` → `site.env.pre-cutover.<TS>` (`chmod 600`).
9. Install `site.cutover-preview.env` as `site.env` (atomic `install -m 600`).
10. `host-build-site.sh` (snapshot build; **not** git pull).
11. `smoke-site.sh`.
12. Switch parser env one-by-one (backup each), start one parser, validate, then the rest.

> The `sb_publishable_*` → legacy JWT swap is **already baked into** `site.cutover-preview.env`
> (Stage 5C.1), so step 9 is a single atomic env install — no manual key editing at the window.

---

## 8. Rollback plan

Printed by preflight §8. Summary:

1. Restore `/opt/scholarshiptop/backups/site.env.pre-cutover.<TS>` → `site.env` (`chmod 600`).
2. `host-build-site.sh` + `smoke-site.sh` (back on hosted Supabase).
3. Restore parser env backups (`parser-env.<NAME>.pre-cutover.<TS>`).
4. Restart the 3 parser services (hosted Supabase target).
5. **Keep hosted Supabase active ≥ 7 days**; keep VPS dump as forensic snapshot.

**Rollback time estimate:** 10–20 minutes (backups present, build cache warm).

---

## Remaining risks

| Risk | Mitigation |
|------|------------|
| `sb_publishable_*` keys rejected by self-host PostgREST | **Mitigated** — `site.cutover-preview.env` uses legacy JWT keys; same Dashboard JWT secret keeps existing sessions valid |
| Storage stays hybrid (`/storage/v1` = 503) | Hosted Supabase Storage retained; no blob migration in this cutover |
| VPS RAM ~3.8 GiB build spike | 4 GiB swap required; preflight §6 verifies |
| Magic link / OAuth callbacks | Password auth verified; magic-link/OAuth need production callback validation or accepted risk |
| `pg_net` / `supabase_functions` triggers | Inventory during extended validation before declaring success |
| Parser accidental dual-write | Freeze parsers first; switch one parser only after site/auth PASS |

---

## Downtime / freeze estimate

| Phase | Estimate |
|-------|----------|
| User-facing downtime (site rebuild + auth smoke) | **10–30 minutes** |
| Maximum planned freeze window | **up to 90 minutes** |
| Abort / rollback decision deadline | **T+45 min** after site switch if unhealthy |
| Rollback duration | **10–20 minutes** |

---

## Final output

- **Verdict:** `READY_FOR_OWNER_GO_REAL_CUTOVER` (PASS_WITH_WARNINGS — single expected `sb_publishable`→legacy-JWT swap, already prepared).
- **Is production unchanged?** **yes**
- **Is hosted Supabase unchanged?** **yes**
- **Is parser state unchanged?** **yes**
- **Exact remaining risks:** see table above (key swap mitigated, storage hybrid, RAM/swap, OAuth/magic-link, triggers, dual-write).
- **Exact downtime estimate:** 10–30 min downtime, up to 90 min freeze, 10–20 min rollback.
- **Exact GO phrase owner must send:**

```
GO STAGE 6B REAL CUTOVER — APPROVED
```

(Owner must additionally confirm: freeze window approved, rollback owner online, hosted Supabase
retained ≥ 7 days, parser freeze approved.)

- **Commit hash:** `abc1b41`

---

## Deliverables

| Path | Purpose |
|------|---------|
| `scripts/vps-migration/stage6a-final-preflight.sh` | Read-only VPS preflight: checks 1–6 + prints cutover/rollback plan |
| `reports/vps-migration/28-stage6a-final-live-cutover-preflight-2026-06-25.md` | This report |

---

## STOP

Stage 6A complete. **Do not execute real cutover** until owner sends:
`GO STAGE 6B REAL CUTOVER — APPROVED`.
