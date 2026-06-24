# Stage 13 — Supabase production export

**Дата:** 2026-06-24  
**Status:** **PASS**

## Verdict: **EXPORT_OK**

---

## Prerequisites

| Check | Result |
|-------|--------|
| VPS PostgreSQL 17 client (`pg_dump`) | **PASS** |
| `SUPABASE_DB_URL` on VPS (`/root/.supabase-db-url`, chmod 600) | **PASS** |
| Production `site.env` | **unchanged** |
| Supabase project | **read-only export only — no writes** |
| Parsers | **unchanged** (still on Supabase API) |

---

## Export result

| Item | Value |
|------|-------|
| Dump file | `/opt/scholarshiptop-db-backups/supabase-prod-20260624T220539Z.dump` |
| Size | ~202 MB |
| Checksum | `.sha256` verified OK |
| Tool | `pg_dump` 17.10 → Supabase Postgres **17.6** |
| Schemas | `public`, `auth`, `storage`, `net` |
| Format | custom (`--no-owner --no-acl`) |

**Note:** First attempt failed (pg_dump 16 vs server 17.6). Resolved by installing `postgresql-client-17`.

---

## Operator notes

- Supabase DB password was reset during migration work; URI updated on VPS only (not in git).
- Direct Postgres URI is separate from anon/service API keys used by the live app — production site unaffected unless something else used the old direct URI.

---

## Reversibility

- Export is **read-only** on Supabase.
- Dump can be deleted from VPS without affecting Supabase.

**EXPORT_OK**
