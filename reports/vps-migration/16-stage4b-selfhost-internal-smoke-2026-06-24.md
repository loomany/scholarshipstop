# Stage 4B — Self-host Supabase API internal smoke (localhost only)

**Date:** 2026-06-24  
**VPS:** 213.155.22.74  
**Verdict:** `PASS_WITH_WARNINGS`

---

## Scope & constraints (confirmed)

| Constraint | Status |
|---|---|
| Production site not switched | ✅ `site.env` still `*.supabase.co` |
| Production env not changed | ✅ No edits to `/opt/scholarshiptop/env/site.env` |
| Parsers not switched | ✅ |
| Hosted Supabase not modified/deleted | ✅ |
| Nginx public routes not enabled | ✅ Test stack binds `127.0.0.1` only |
| No cutover / dual-write | ✅ |
| Storage hybrid/read-only | ✅ `/storage/v1` returns 503 on test gateway |
| Secrets not printed/committed | ✅ |

---

## Stack deployed (internal test only)

| Service | Container | Port bind | Status |
|---|---|---|---|
| PostgREST v12.2.8 | `scholarshiptop-postgrest-test` | `127.0.0.1:3001→3000` | **UP** — connected to VPS PG 17 |
| nginx gateway | `scholarshiptop-supabase-api-gateway-test` | `127.0.0.1:54321→8080` | **UP** |
| GoTrue v2.171.0 | `scholarshiptop-gotrue-test` | `127.0.0.1:9999` | **BLOCKED** — crash loop on auth migration |

**Env:** `/opt/scholarshiptop/env/supabase-api.env` (chmod 600, not in git)  
**JWT mode:** `internal` — production JWT secret not available on VPS; internal anon/service JWTs generated for smoke only.

**Compose:**
```bash
docker compose -f ops/vps/docker-compose.supabase-api.example.yml --profile supabase-api-test up -d
```

---

## Fixes applied during Stage 4B

1. **Postgres connectivity for Docker** — `listen_addresses=*`, Docker bridge in `pg_hba`, `authenticator` role + password file.
2. **Missing role grants after restore** — `grant-postgrest-api-roles.sh` re-applies Supabase-like grants; scholarships lockdown preserved (`scholarships_safe_listing` for anon).
3. **Gateway nginx** — dynamic DNS resolver + `rewrite` for `/rest/v1/*` so gateway survives PostgREST restarts and starts when GoTrue is down.
4. **Smoke scripts** — use `scholarships_safe_listing` (matches lockdown migration), correct RPC params (`p_inst_a`/`p_inst_b` UUIDs).

---

## Internal smoke results

### Infrastructure (`127.0.0.1:54321`)

| Endpoint | HTTP | Notes |
|---|---|---|
| `GET /health` | 200 | Gateway OK |
| `GET /auth/v1/health` | 502 | GoTrue down (expected) |
| `GET /rest/v1/` | 200 | PostgREST OpenAPI via gateway |

### PostgREST / RLS / RPC (internal JWT)

| Check | Result |
|---|---|
| `GET /rest/v1/scholarships_safe_listing?select=id,slug&is_active=eq.true&limit=3` (anon) | ✅ 3 rows |
| `HEAD …/scholarships_safe_listing` + `Prefer: count=exact` | ✅ `Content-Range: 0-21107/21108` |
| `GET /rest/v1/profiles?select=id&limit=5` (anon) | ✅ `[]` — RLS OK |
| `GET /rest/v1/profiles?select=id&limit=1` (service_role) | ✅ 1 row — BYPASSRLS OK |
| `POST /rest/v1/rpc/get_comparison_data` `{p_inst_a,p_inst_b}` (anon) | ✅ HTTP 200 |
| `GET http://127.0.0.1:3001/` (PostgREST direct) | ✅ 200 |
| Anon JWT decode | ✅ `role=anon`, `ref=qlqlvhgosxhuibzhfsnh` |

### Auth (GoTrue)

| Check | Result |
|---|---|
| `GET http://127.0.0.1:9999/health` | ❌ connection refused / crash loop |
| Docker logs | Fatal: migration `20221208132122_backfill_email_last_sign_in_at` — `uuid = text` on restored PG17 auth schema |

`GOTRUE_DB_AUTOMIGRATE=false` is set but GoTrue v2.171.0 still attempts pending migrations on startup.

---

## RLS / JWT summary

- **Internal JWT mode:** PostgREST validates internally generated anon/service JWTs signed with `/root/.supabase-jwt-secret-internal`.
- **RLS:** Behaves as expected — anon sees public safe listing; profiles empty; service_role bypasses RLS.
- **Production token compatibility:** **NOT tested** — requires Supabase Dashboard JWT secret on VPS and legacy `eyJ…` anon key (production uses `sb_publishable_*` / `sb_secret_*` gateway keys).

---

## supabase-js flow compatibility (internal stack)

| Flow | Compatible? | Notes |
|---|---|---|
| `supabase.from('scholarships_safe_listing').select()` | ✅ | Anon reads via safe listing view |
| `supabase.from('scholarships').select()` (anon) | ❌ | Revoked by lockdown migration (same as hosted) |
| `supabase.from('profiles').select()` (anon) | ✅ | Returns empty (RLS) |
| `supabase.rpc('get_comparison_data', {p_inst_a, p_inst_b})` | ✅ | |
| `supabase.auth.*` | ❌ | GoTrue not running |
| `supabase.storage.*` | ❌ | Not deployed (hybrid CDN) |
| Production `sb_publishable_*` keys against self-host PostgREST | ❌ | PostgREST expects legacy JWT Authorization header |

---

## BLOCKED before public shadow test

1. **GoTrue startup** — resolve auth migration conflict on restored schema (pin GoTrue version, patch migration, or full migration seed).
2. **Production JWT secret** — copy from Supabase Dashboard → `/root/.supabase-jwt-secret` (never commit).
3. **Legacy anon/service JWTs** — map `sb_publishable_*` / `sb_secret_*` or obtain legacy JWTs for PostgREST direct auth.
4. **OAuth redirect URIs** — Google client needs test-host callback if auth shadow tested.
5. **Public nginx route** — intentionally not enabled in 4B.

---

## Resource usage (after containers up)

| Container | CPU | RAM |
|---|---|---|
| postgrest-test | ~0.5% | ~23.5 MiB |
| gateway-test | ~0% | ~4.6 MiB |
| gotrue-test | 0% | 0 B (not running) |

**Host:** 3.8 GiB total, ~2.8 GiB used, ~1.1 GiB available.

---

## Docker logs hygiene

- **PostgREST:** No fatal errors, no JWT mismatch, schema cache loaded (63 relations, 59 functions).
- **GoTrue:** Repeated fatal migration errors (see above).
- **Gateway:** Clean start after nginx rewrite fix.

---

## Scripts added/updated (safe for git)

- `ops/vps/scripts/setup-supabase-api-env.sh`
- `ops/vps/scripts/setup-postgrest-authenticator.sh`
- `ops/vps/scripts/grant-postgrest-api-roles.sh`
- `ops/vps/scripts/generate-internal-supabase-jwt.sh`
- `ops/vps/scripts/skip-gotrue-failing-migrations.sh`
- `ops/vps/scripts/seed-gotrue-schema-migrations.sh`
- `ops/vps/scripts/stage4b-deploy-internal-stack.sh`
- `ops/vps/scripts/debug-stage4b-rest.sh`
- `scripts/vps-migration/stage4b-selfhost-internal-smoke.sh`
- `scripts/vps-migration/stage4a-selfhost-smoke-plan.sh` (safe listing)
- `ops/vps/docker-compose.supabase-api.example.yml`
- `ops/vps/nginx/includes/scholarshiptop-supabase-api-locations.example.conf`

---

## Teardown (optional)

```bash
cd /opt/scholarshiptop/app
docker compose -f ops/vps/docker-compose.supabase-api.example.yml --profile supabase-api-test down
```

Production site, parsers, and hosted Supabase remain unchanged.
