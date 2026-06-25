# Stage 4B.1 — GoTrue migration compatibility fix

**Date:** 2026-06-24  
**VPS:** 213.155.22.74  
**Verdict:** `STAGE_4B1_AUTH_PASS`

---

## Executive summary

GoTrue v2.171.0 now runs **localhost-only** against restored VPS PostgreSQL (`scholarshiptop_prod`) without crash loop. Auth data preserved. PostgREST smoke still **PASS**.

**Two-part fix:**
1. **Primary:** Docker `command: ["gotrue", "serve"]` — skip Pop migrations on already-migrated Supabase auth schema.
2. **Secondary (idempotent):** Sync all 54 GoTrue v2.171 embedded migration versions into `public.schema_migrations` (with backup table).

---

## Why GoTrue crashed

### Symptom
```
running db migrations: migrations/20221208132122_backfill_email_last_sign_in_at.up.sql
ERROR: operator does not exist: uuid = text (SQLSTATE 42883)
```

### Failing SQL (GoTrue v2.171 embedded)
```sql
UPDATE auth.identities
  SET last_sign_in_at = '2022-11-25'
  WHERE ... AND id = user_id::text;
```

On restored Supabase auth schema, **`auth.identities.id` is `uuid`**, not `text`. The migration assumed legacy text `id` column — valid for old GoTrue, invalid on modern Supabase-managed auth (PG 17).

### Root causes (three layers)

| # | Issue | Detail |
|---|---|---|
| 1 | **Default image always migrates** | `supabase/gotrue:v2.171.0` CMD is `auth` → Cobra root runs `migrate` then `serve`. `GOTRUE_DB_AUTOMIGRATE=false` is **ignored** (not read by v2.171). |
| 2 | **Wrong migration table** | Pop uses **`public.schema_migrations`**, not `auth.schema_migrations`. Restored DB had **27** rows in `public` vs **104** in `auth`. |
| 3 | **Schema ahead of Pop ledger** | `auth.schema_migrations` already had `20221208132122`, but `public.schema_migrations` stopped at `20221125140132` → Pop tried to re-apply the failing backfill. |

### Auth schema state (before fix)

| Table | Count |
|---|---|
| auth.users | **555** |
| auth.identities | **566** |
| auth.sessions | 730 |
| auth.refresh_tokens | 1196 |
| auth.audit_log_entries | 17329 |
| public.schema_migrations | **27** |
| auth.schema_migrations | **104** |

`auth.identities.id` type: **uuid** (not text).

---

## Options considered

| Option | Verdict |
|---|---|
| **A. Mark migrations applied in `public.schema_migrations`** | ✅ Applied (belt-and-suspenders) |
| **B. Pin older GoTrue version** | ❌ Would diverge from hosted Supabase auth |
| **C. Skip migrate via `gotrue serve` only** | ✅ **Primary fix** |
| **D. Test DB first** | ✅ `scholarshiptop_auth_test` created, fix validated |

No destructive DDL. No changes to `auth.users` / identities / sessions data.

---

## Fix applied

### 1. Compose: serve-only (primary)

```yaml
command: ["gotrue", "serve"]
```

File: `ops/vps/docker-compose.supabase-api.example.yml`

### 2. Migration metadata sync (secondary)

Script: `scripts/vps-migration/fix-gotrue-auth-migrations-vps.sh`

- `--dry-run` / `--apply`
- `--create-test-db` → `scholarshiptop_auth_test`
- `--confirm-prod` required for `scholarshiptop_prod`
- Backs up `public.schema_migrations` → `public.schema_migrations_gotrue_backup_<timestamp>`
- Inserts 27 missing GoTrue v2.171 versions (idempotent)

### 3. Gateway nginx auth rewrite

`/auth/v1/*` now strips prefix (same pattern as `/rest/v1/*`).

---

## Test-first validation

| Step | DB | Result |
|---|---|---|
| Create throwaway DB | `scholarshiptop_auth_test` | auth schema copied (555 users, 566 identities) |
| Apply migration sync | auth_test | 27 → 54 public migrations |
| GoTrue serve-only | scholarshiptop_prod | **Up 7+ hours (healthy)** |

---

## After fix — smoke results

| Check | Result |
|---|---|
| `GET 127.0.0.1:9999/health` | **200** |
| `GET 127.0.0.1:54321/auth/v1/health` | **200** |
| `GET 127.0.0.1:54321/auth/v1/settings` | **200** |
| GoTrue container stable | **> 2 min** (7+ hours observed) |
| auth.users count | **555** (unchanged) |
| auth.identities count | **566** (unchanged) |
| profiles FK `profiles_id_fkey → auth.users` | intact |
| `stage4b-selfhost-internal-smoke.sh` | **STAGE_4B_INTERNAL_PASS** |

### Counts before / after

| Metric | Before | After |
|---|---|---|
| auth.users | 555 | 555 |
| auth.identities | 566 | 566 |
| public.schema_migrations | 27 | 54 |
| auth.schema_migrations | 104 | 104 |

---

## RAM/CPU (GoTrue running)

| Container | CPU | RAM |
|---|---|---|
| gotrue-test | ~0% | ~26 MiB |
| postgrest-test | ~0.3% | ~37 MiB |
| gateway-test | ~0% | ~5.4 MiB |

---

## Stage 4C — Production JWT preparation (inventory only)

**Not changed:** production `site.env`, hosted Supabase, parsers, public nginx.

### Obtain JWT secret (manual, Dashboard)

1. Supabase Dashboard → Project **qlqlvhgosxhuibzhfsnh**
2. Project Settings → **API** → **JWT Settings** → **JWT Secret**
3. On VPS only: save to `/root/.supabase-jwt-secret` (chmod 600, never commit)

### Generate legacy anon/service JWTs (Stage 4C)

Production keys are `sb_publishable_*` / `sb_secret_*` (gateway format). Self-hosted PostgREST expects legacy `eyJ...` JWTs signed with the Dashboard JWT secret.

Use existing script after secret is on VPS:

```bash
# After /root/.supabase-jwt-secret exists:
bash ops/vps/scripts/setup-supabase-api-env.sh   # JWT_MODE=production
# Legacy JWT generation (internal mode reference):
bash ops/vps/scripts/generate-internal-supabase-jwt.sh  # internal smoke only
```

For production-compatible keys, add Stage 4C script that signs `role=anon` and `role=service_role` with Dashboard secret (do not print tokens).

### Verify without exposing secrets

```bash
bash ops/vps/scripts/verify-jwt-secret.sh   # compares secret vs legacy anon JWT file
```

---

## Constraints confirmed

| Constraint | Status |
|---|---|
| Production site not switched | ✅ |
| Production env not changed | ✅ |
| Parsers not switched | ✅ |
| Hosted Supabase not modified | ✅ |
| Public nginx routes not enabled | ✅ localhost only |
| No cutover / dual-write | ✅ |
| Secrets not printed/committed | ✅ |

---

## Files added/changed

| File | Purpose |
|---|---|
| `scripts/vps-migration/fix-gotrue-auth-migrations-vps.sh` | Idempotent migration metadata sync |
| `ops/vps/docker-compose.supabase-api.example.yml` | `gotrue serve` only |
| `ops/vps/nginx/includes/scholarshiptop-supabase-api-locations.example.conf` | Auth path rewrite |
| `ops/vps/scripts/diagnose-gotrue-auth-schema.sh` | Auth table diagnostics |
| `ops/vps/scripts/diagnose-gotrue-migrations.sh` | Migration table comparison |
| `ops/vps/scripts/diagnose-public-schema-migrations.sh` | public.schema_migrations audit |
| `ops/vps/scripts/diagnose-gotrue-db-target.sh` | Container DB target (redacted) |
| `ops/vps/scripts/start-gotrue-test-db.sh` | Start GoTrue against test DB |
| `ops/vps/scripts/verify-gotrue-start.sh` | GoTrue stability smoke |

---

## Teardown test DB (optional)

```bash
sudo -u postgres dropdb scholarshiptop_auth_test
```

Production restored DB and test stack remain on VPS for continued internal smoke.
