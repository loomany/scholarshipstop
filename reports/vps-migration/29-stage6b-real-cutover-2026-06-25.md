# Stage 6B — Real Supabase → VPS cutover (EXECUTED)

**Дата:** 2026-06-25
**VPS:** `213.155.22.74`
**Owner GO received:** `GO STAGE 6B REAL CUTOVER — APPROVED`
**Execution channel:** SSH `ubuntu@213.155.22.74` (key auth, passwordless sudo, tmux).
**Supersedes:** the earlier *preflight-BLOCKED* attempt documented previously at this path; the blockers
were cleared per report `30-stage6b-remediation-readiness-2026-06-25.md` (scripts synced, validation
dry-run PASS, parser envs pre-staged, +4 GiB swap added → total 8 GiB).

## Verdict: **PASS_WITH_WARNINGS**

The real cutover **completed successfully**. Production `scholarshiptop.com` now runs entirely on the
**self-hosted VPS Supabase stack** (`https://scholarshiptop.com/supabase`); the site frontend, server,
auth, and all three parsers are switched off hosted Supabase. Two non-destructive in-flight fixes and
one build-config fix were required (details below) — hence *PASS_WITH_WARNINGS* rather than a clean PASS,
but the **final state is fully migrated and healthy**, and **no rollback was needed**.

---

## Timeline (UTC)

| T | Event | Result |
|---|-------|--------|
| 17:44:40 | **Phase A** — freeze parsers (stop ×3) | `NO_ACTIVE_PARSERS` — hosted writes stopped |
| 17:45:43 → 17:50:55 | **Phase B** — final hosted dump in `tmux` | `rc=0`, 203 MB |
| 17:51 | **Phase C** — `sha256 -c` | `OK` |
| ~17:55 | *in-flight fix #1* — dump-dir perms (`postgres` could not read) | dir `root:postgres 750`, dump `640` |
| ~17:56 | *in-flight fix #2* — `create-seo-hub-content-vps.sql` newline bug | fixed + re-synced |
| 17:58:00 → 18:01:00 | **Phase D** — clean-test restore + validate (throwaway DB) | `CLEAN_RESTORE_TEST_PASS` |
| 18:03:31 → 18:06:40 | **Phase E** — superuser restore → `scholarshiptop_prod` + API refresh | `rc=0`, health `200/200` |
| 18:07 | **Phase F** — extended validation (prod DB) | `RESTORE_VALIDATION_PASS_WITH_WARNINGS` |
| 18:08 | API serves fresh data | `scholarships_safe_listing=21171` |
| **18:10:36** | **Phase G** — `site.env` ← cutover env (**T0**, abort T+45 = 18:55:36) | backup saved |
| 18:17:02 | *in-flight fix #3* — `.env.local` `NEXT_PUBLIC_SUPABASE_URL` override → self-host | backup saved |
| 18:17:13 → 18:35:41 | **Phase H** — `host-build-site.sh` (snapshot, no `git pull`) | `rc=0`, site **healthy** |
| ~18:36–18:38 | **Phase I** — site smoke + auth smoke | **PASS** |
| 18:39:03 / 18:39:27 / 18:39:37 | **Phase J** — parser switch one-by-one | all `active`, self-host |
| 18:42:05 | **Phase K** — final consolidated verification | **all green** |

---

## Actual downtime & freeze

- **User-facing site downtime:** **≤ ~1 minute** — only the brief `site`+`nginx` container *recreate*
  window at ~18:35:30; container reported `healthy` within ~16 s. The previous (hosted) container kept
  serving for the entire build; the `site.env` switch + 18-minute build caused **no outage**.
- **Parser freeze duration:** **~55 minutes** (`17:44:40` → first parser restart `18:39:03`; last
  `18:39:37`). Within the planned ≤90 min freeze budget.
- **T+45 abort deadline:** site healthy at **T+25** (18:35:41) — comfortably inside the window.

---

## Dump / restore validation

- **Dump:** `supabase-prod-20260625T174543Z.dump` (203 MB), `pg_dump --format=custom` schemas
  `public, auth, storage, net`; `sha256` verified `OK`.
- **Clean-test restore** (throwaway `scholarshiptop_restore_test`, dropped after): `CLEAN_RESTORE_TEST_PASS`.
- **Production restore** into `scholarshiptop_prod`: `rc=0`; `seo_hub_content` restored to **919** rows via
  the (now-fixed) fallback DDL; benign Supabase-specific errors ignored (`public` schema pre-exists;
  `supabase_functions.http_request` webhook trigger has no target schema on self-host — intentionally not carried over).
- **Extended validation** (`RESTORE_VALIDATION_PASS_WITH_WARNINGS`): all exact-match tables PASS;
  3 "FAIL" rows are simply **newer-than-baseline** counts from the fresh dump (correct supersets):

  | Table | Baseline | Restored | Note |
  |-------|---------:|---------:|------|
  | public.scholarships | 21110 | **21171** | newer (+61) — expected |
  | public.providers | 6385 | **6398** | newer (+13) — expected |
  | public.google_indexing_queue | 33756 | **33811** | newer (+55) — expected |
  | auth.users / identities / profiles | 555 / 566 / 550 | match | PASS |
  | storage.objects | 5353 | 5353 | PASS |
  | seo_hub_content | 919 | 919 | PASS |

  Extensions present (`pg_trgm, pgcrypto, plpgsql, unaccent, uuid-ossp`); RLS policies **49**; triggers **42**; DB size **847 MB**.
- **Live self-host REST** after API refresh: `scholarships_safe_listing` count = **21171** (fresh data served).

---

## Site smoke

| Check | Result |
|-------|--------|
| `GET /` | **200** |
| `GET /sitemap.xml` | **200** |
| 3 scholarship detail pages | **200 / 200 / 200** |
| Baked client bundle (`.next/static`) refs to hosted `*.supabase.co` | **0 files** |
| Baked client bundle refs to `scholarshiptop.com/supabase` | **11 files** |
| Site container | `healthy` |

## Auth smoke (against live self-host)

`STAGE_5C1_AUTH_PASS` — signUp / signInWithPassword / getUser / profiles upsert / refreshSession /
signOut / cleanup all **PASS**. Auth-table counts **unchanged** before/after (users 555, identities 566,
profiles 550) → no test residue.

## Parser switch result

All three switched one-by-one via pre-staged `*.next-cutover.env`, each backed up at switch time:

| Service | State | Target | Recent errors | Hosted refs |
|---------|-------|--------|---------------|-------------|
| `scholarshiptop-parser-bigfuture` | `active` | SELFHOST | 0 | 0 |
| `scholarshiptop-parser-scholarship-america` | `active` | SELFHOST | 0 | 0 |
| `scholarshiptop-parser-simpler-grants-gov` | `active` | SELFHOST | 0 | 0 |

---

## In-flight fixes applied (the "warnings")

1. **Dump-dir permissions** — `/opt/scholarshiptop-db-backups` was `drwx------ root`, so the `postgres`
   OS user could not read the dump (first clean-test failed with *Permission denied*). Fixed
   non-destructively: dir → `root:postgres 0750`, dumps → `0640` (group access only, not world).
2. **`create-seo-hub-content-vps.sql` newline bug** — a missing newline merged the trailing `--` comment
   into the `CREATE TABLE` line, so the table DDL was silently commented out. Fixed in repo + re-synced.
   This was on the critical path: on the prod restore `seo_hub_content` *was* skipped by `pg_restore`
   and the fixed fallback correctly recreated + repopulated it (919 rows).
3. **`app/.env.local` override** — it pinned `NEXT_PUBLIC_SUPABASE_URL` to the hosted project, which in
   Next.js overrides `.env.production` at build time. The first build (caught before any `docker up`) was
   killed; `.env.local`'s Supabase keys were aligned to self-host (backup saved) and the site rebuilt.
   Verified: 0 hosted refs in the shipped bundle.

All three are addressed; the final running state is clean.

---

## Final state

- **Production unchanged?** No — intentionally switched (this was the approved cutover).
- **`site.env`:** self-host (`https://scholarshiptop.com/supabase`, legacy JWTs). Backup:
  `/opt/scholarshiptop/backups/site.env.pre-cutover.20260625T181036Z`.
- **`app/.env.local`:** aligned to self-host. Backup: `…/backups/.env.local.pre-cutover.20260625T181702Z`.
- **Parsers:** all 3 on self-host; per-parser backups `…/backups/parser-env.<name>.at-switch.<TS>`.
- **Hosted Supabase:** **untouched, not deleted, not modified.**

## Owner-requested final answers

- **Verdict:** **PASS_WITH_WARNINGS** (cutover complete; 3 in-flight non-destructive fixes; validation warnings are newer-than-baseline counts).
- **Actual downtime:** **≤ ~1 minute** (site/nginx recreate at ~18:35 UTC).
- **Freeze duration:** **~55 minutes** (17:44:40 → 18:39:37 UTC).
- **Dump/restore validation:** dump `rc=0` + `sha256 OK`; clean-test `PASS`; prod restore `rc=0`; extended validation `PASS_WITH_WARNINGS`; live REST count **21171**.
- **Site smoke:** **PASS** (home, sitemap, 3 details = 200; bundle on self-host; container healthy).
- **Auth smoke:** **PASS** (`STAGE_5C1_AUTH_PASS`; no residue).
- **Parser switch result:** **PASS** — 3/3 active on self-host, 0 errors, 0 hosted refs.
- **Hosted Supabase writes stopped?** **YES** — parsers frozen at 17:44:40 then retargeted to self-host; site/auth writes now go to `scholarshiptop_prod`.
- **Rollback window status:** **NOT USED** — all backups retained and reversible (site.env, .env.local, parser envs); hosted Supabase intact as the fallback.
- **Supabase keep active 7 days:** **CONFIRMED** — hosted Supabase will be retained for at least 7 days before any decommission decision.
