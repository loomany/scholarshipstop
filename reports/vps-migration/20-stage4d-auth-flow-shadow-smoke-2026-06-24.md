# Stage 4D — Auth flow shadow smoke

**Дата:** 2026-06-24  
**VPS:** `213.155.22.74`  
**Scope:** реальные auth flows на self-host shadow stack без переключения production.

## Verdict: **PASS_WITH_WARNINGS**

| Area | Result |
|------|--------|
| Auth flow smoke (`stage4d-auth-flow-shadow-smoke.mjs`) | **STAGE_4D_AUTH_FLOW_PASS_WITH_WARNINGS** |
| Orchestration (`stage4d-auth-flow-shadow-smoke.sh`) | **STAGE_4D_AUTH_FLOW_PASS_WITH_WARNINGS** |
| Production site | **unchanged** |

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| `NEXT_PUBLIC_SUPABASE_URL` unchanged | **PASS** (hosted `*.supabase.co`) |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No cutover / dual-write | **PASS** |
| Storage hybrid/read-only | **PASS** (not in auth scope) |
| No secrets in git/logs | **PASS** |

---

## Fix applied during Stage 4D

GoTrue signUp failed initially with `relation "identities" does not exist` because Postgres `search_path` did not include `auth`.

**Fix:** `ops/vps/scripts/setup-supabase-api-env.sh` now sets GoTrue DB URL with `options=-c search_path=auth`.

---

## Auth flows tested (internal shadow gateway)

**Base URL for Bearer/session flows:** `http://127.0.0.1:54321` (same self-host stack as public shadow; avoids nginx basic-auth / Bearer conflict).

| Flow | Result |
|------|--------|
| `signUp` (password, autoconfirm) | **PASS** |
| `signInWithPassword` | **PASS** |
| `auth.getUser` with session | **PASS** |
| `profiles` upsert (`id = auth.users.id`) | **PASS** |
| Authenticated read own profile | **PASS** |
| Anon cannot read test profile | **PASS** |
| Service_role reads test profile | **PASS** |
| Authenticated cannot read other profile | **PASS** |
| Existing migrated profile read-only (service_role) | **PASS** |
| Authenticated cannot read existing migrated profile | **PASS** |
| `signOut` + session cleared | **PASS** |
| Public shadow `/auth/v1/health` + `/auth/v1/settings` | **PASS** (200 via basic auth) |

### Test user

| Item | Value |
|------|-------|
| Email pattern | `shadow-stage4d+<timestamp>@invalid.scholarshiptop.test` |
| Cleanup | **deleted** after smoke (auth.users + auth.identities + public.profiles) |
| Baseline restored | **yes** |

---

## Flows not tested (and why)

| Flow | Status | Reason |
|------|--------|--------|
| Magic link / OTP sign-in | **skipped** | Avoid mass email on shadow stack |
| `refreshSession` | **skipped (WARN)** | GoTrue session model missing `oauth_client_id` in restored schema |
| Bearer session on **public** shadow path | **skipped (WARN)** | nginx basic auth shares `Authorization` header with Bearer JWT |
| Google OAuth login | **inventory only** | `GOTRUE_EXTERNAL_GOOGLE_ENABLED=false` on shadow stack; redirect URLs not configured for shadow |
| Production frontend cookies | **not touched** | Smoke uses isolated clients (`persistSession: false`) on test gateway only |

### Google OAuth inventory (plan)

- Shadow stack: Google provider **disabled**.
- Production hosted Supabase: unchanged.
- Before OAuth cutover rehearsal: add redirect URI for shadow host/path, enable provider in `supabase-api.env`, test callback on non-production path only.

---

## Counts before / after

| Table | Before | After smoke (+1) | After cleanup |
|-------|--------|------------------|---------------|
| `auth.users` | 555 | 556 | **555** |
| `auth.identities` | 566 | 567 | **566** |
| `public.profiles` | 550 | 551 | **550** |

---

## RLS / authenticated result

| Role | Test profile | Other / migrated profile |
|------|--------------|------------------------|
| `anon` | not visible | not visible |
| `authenticated` (test user) | own row readable/writable | not visible |
| `service_role` | visible | visible |

---

## Production smoke

| URL | HTTP |
|-----|------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |
| 3 scholarship detail pages | **200** each |

**Site logs:** no references to `/vps-shadow-supabase-4c/` in last 30m.

---

## RAM / CPU

| Metric | Value |
|--------|-------|
| Memory | 3.8 GiB total, ~1.1 GiB available |
| Load average | ~0.76, 0.57, 0.45 |

---

## Service logs

| Container | Result |
|-----------|--------|
| `gotrue-test` | WARN — prior signup errors in log (pre search_path fix); no new fatal after fix |
| `postgrest-test` | PASS |
| `gateway-test` | PASS |

---

## Tooling added (repo)

| File | Purpose |
|------|---------|
| `scripts/vps-migration/stage4d-auth-flow-shadow-smoke.mjs` | supabase-js auth flow smoke |
| `scripts/vps-migration/stage4d-auth-flow-shadow-smoke.sh` | Orchestration, counts, cleanup, production checks |
| `ops/vps/scripts/setup-supabase-api-env.sh` | GoTrue `search_path=auth` fix |
| `ops/vps/scripts/diagnose-gotrue-search-path.sh` | Debug helper (no secrets) |

---

## Runbook (VPS)

```bash
sudo bash /opt/scholarshiptop/app/scripts/vps-migration/stage4d-auth-flow-shadow-smoke.sh
```

---

## Commit

`COMMIT_HASH` — Stage 4D auth flow shadow smoke scripts and GoTrue search_path fix.
