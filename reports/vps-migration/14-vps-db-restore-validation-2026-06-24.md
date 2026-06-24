# Stage 14 — VPS DB restore validation (+ Stage 3B hardening)

**Дата:** 2026-06-24  
**Status:** **PASS**

## Verdict: **STAGE_3B_PASS**

---

## VPS PostgreSQL (post-restore)

| Item | Value |
|------|-------|
| PostgreSQL | **17.x**, port **5432** |
| Database | `scholarshiptop_prod` |
| App user | `scholarshiptop_app` (non-superuser) |
| Listen | **127.0.0.1:5432** only |
| DB size | **~776 MB** |
| Backup dir | `/opt/scholarshiptop-db-backups` |

---

## Restore (Stage 3)

| Step | Result |
|------|--------|
| Dump | `supabase-prod-20260624T220539Z.dump` (~202 MB) |
| `pg_restore` as `postgres` superuser | **OK** |
| Extensions | `pg_trgm`, `unaccent`, `pgcrypto`, `uuid-ossp` |
| `pg_net` | **not installed** (VPS package unavailable; `net.*` triggers skipped) |

---

## Stage 3B — Manual restore fix converted to scripted/runbook step

### Problem: `seo_hub_content` missing after first restore

Supabase dump defines:

```sql
id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL
```

On a plain VPS PostgreSQL install there is no `extensions` schema and `uuid-ossp` is not installed there. `pg_restore` then **silently skips** `CREATE TABLE public.seo_hub_content` and all 919 rows.

### Automated fix (no manual steps required)

| Script | When | What |
|--------|------|------|
| `ops/vps/scripts/restore-postgres-pre.sh` | **before** `pg_restore` | Creates Supabase roles (`anon`, `authenticated`, `service_role`); creates schema `extensions`; installs `pg_trgm`, `unaccent`, `pgcrypto`, `uuid-ossp` **into `extensions` schema** |
| `ops/vps/scripts/restore-postgres-post.sh` | **after** `pg_restore` | Idempotent check: if `seo_hub_content` missing or row count ≠ 919, applies `create-seo-hub-content-vps.sql` (fallback uses `gen_random_uuid()`) and restores data from dump |
| `ops/vps/scripts/restore-postgres-superuser.sh` | orchestrator | pre → pg_restore → post |
| `ops/vps/scripts/restore-postgres-test.sh` | app-user restore | same pre/post hooks |
| `ops/vps/scripts/restore-postgres-clean-test.sh` | repeatability test | drop/create `scholarshiptop_restore_test` → full pipeline → validate → drop |

**Runbook (VPS):**

```bash
sudo bash ops/vps/scripts/restore-postgres-superuser.sh \
  /opt/scholarshiptop-db-backups/supabase-prod-YYYYMMDDTHHMMSSZ.dump

sudo bash ops/vps/scripts/restore-postgres-clean-test.sh \
  /opt/scholarshiptop-db-backups/supabase-prod-YYYYMMDDTHHMMSSZ.dump
```

With `restore-postgres-pre.sh` in place, clean restore test restored `seo_hub_content` (**919 rows**) without needing the post-restore DDL fallback.

---

## Stage 3B — Production smoke (after Supabase password/URI update)

**Date:** 2026-06-24  
**Method:** HTTPS read-only checks + VPS site container logs (24h)

| Check | Result |
|-------|--------|
| `https://scholarshiptop.com` | **200** — homepage renders scholarship content |
| `/sitemap.xml` | **200** |
| 5 scholarship detail pages (from sitemap) | **200** each |
| Site container `scholarshiptop-site` | **healthy** (Up, healthy) |
| Docker logs: Supabase/auth/API errors (24h) | **0 lines** matching `supabase` |
| Docker logs: other errors | EACCES on `.next/cache/fetch-cache` (pre-existing cache permissions; unrelated to Supabase password reset) |

**Verdict:** **PRODUCTION_SMOKE_PASS** — production site unaffected by direct Postgres URI password change (app uses Supabase API keys).

Script: `scripts/vps-migration/stage3b-production-smoke.sh`

---

## Stage 3B — Restore repeatability

| Check | Result |
|-------|--------|
| Clean restore into `scholarshiptop_restore_test` | **PASS** |
| `validate-vps-db-restore-extended.sh` on test DB | **RESTORE_VALIDATION_PASS** (14/14 tables) |
| `seo_hub_content` after pre-restore only | **919 rows** (no manual DDL needed) |
| Test DB dropped after validation | **yes** |
| `scholarshiptop_prod` re-validated | **RESTORE_VALIDATION_PASS** |

---

## Row count validation (baseline 2026-06-24)

All **14** tables **PASS** (see Stage 3B clean test output).

| Other checks | Result |
|--------------|--------|
| RLS policies | **49** |
| Triggers | **42** |
| Extensions on prod DB | `pg_trgm`, `unaccent`, `pgcrypto`, `uuid-ossp`, `plpgsql` |

---

## Secrets hygiene (Stage 3B)

| Item | Status |
|------|--------|
| `/root/.supabase-db-url` on VPS | present, chmod 600, **not in git** |
| Dump files (`*.dump`) | on VPS only, **gitignored** |
| `postgres.env` (live) | VPS only, **not in git** |
| `ops/env/postgres.env.example` | template only, safe to commit |
| `*супабейз*`, `Key Cloud*` | **gitignored** |
| `git status` | no dump/env/password files staged |

---

## Known gaps (non-blocking)

- `pg_net` extension not on VPS (`net.*` HTTP triggers skipped).
- `supabase_functions.http_request` triggers fail on restore (expected without Supabase Edge stack).
- GoTrue / PostgREST self-host → Stage 4 design (not started).

---

## Rollback

Stages 1–3B reversible without touching Supabase production. Parsers and site remain on Supabase API.

---

## Final verdict

| Stage | Verdict |
|-------|---------|
| 3 — Restore validation | **PASS** |
| 3B — Hardening + smoke + repeatability | **STAGE_3B_PASS** |
| 4–6 cutover | **NOT STARTED / NOT APPROVED** |

**Production / parsers / Supabase: NOT switched.**
