# Stage 4C — Public shadow Supabase-compatible API

**Дата:** 2026-06-24  
**VPS:** `213.155.22.74`  
**Scope:** публичный shadow endpoint для тестов; **без cutover**, **без dual-write**, production site/parsers/hosted Supabase не трогали.

## Verdict: **PASS_WITH_WARNINGS**

| Area | Result |
|------|--------|
| Public shadow curl smoke | **STAGE_4C_SHADOW_PASS** |
| supabase-js shadow smoke | **STAGE_4C_JS_SHADOW_PASS** (run as root — `shadow-api.env` chmod 600) |
| Production site | **unchanged** (`NEXT_PUBLIC_SUPABASE_URL` → hosted `*.supabase.co`) |
| Dashboard JWT secret on VPS | **WARN** — `/root/.supabase-jwt-secret` **missing**; shadow uses **internal** legacy `eyJ…` JWT files |

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** — `site.env` still hosted Supabase URL |
| `NEXT_PUBLIC_SUPABASE_URL` unchanged | **PASS** |
| Parsers not switched | **PASS** (out of scope; no parser env touched) |
| Hosted Supabase not modified/deleted | **PASS** |
| No cutover / dual-write | **PASS** |
| Storage hybrid/read-only | **PASS** — `/storage/v1` → **503** |
| No secrets in git/logs | **PASS** — only examples + smoke scripts committed |

---

## Shadow public endpoint

| Item | Value |
|------|-------|
| URL | `https://scholarshiptop.com/vps-shadow-supabase-4c/` |
| Protection | HTTP basic auth + obscure path prefix |
| Basic auth user | `shadow-smoke` (password in `/opt/scholarshiptop/env/shadow-api.env`, chmod 600) |
| Upstream | `scholarshiptop-supabase-api-gateway-test:8080` (Docker network, not host `127.0.0.1:54321`) |

**Nginx note:** `/rest/v1/` forwards `apikey` → `Authorization: Bearer $http_apikey` so PostgREST role JWT works alongside curl `-u` basic auth (single `Authorization` header cannot carry both).

---

## Pre-flight (before public route)

| Check | Result |
|-------|--------|
| Localhost stack | GoTrue `/auth/v1/health` **200**, PostgREST `/rest/v1/` **200**, gateway `/health` **200** |
| RAM | 3.8 GiB total, ~1.6 GiB available; load ~0.5 |
| Production | `https://scholarshiptop.com` **200**, `/sitemap.xml` **200** |
| `auth.users` / `auth.identities` | **555** / **566** |
| Git secrets hygiene | No real env/secrets staged for commit |

---

## Endpoints (public shadow)

| Path | HTTP | Notes |
|------|------|-------|
| `/health` | 200 | Plain `ok` |
| `/auth/v1/health` | 200 | GoTrue |
| `/auth/v1/settings` | 200 | Config only; no login/magic-link tests |
| `/rest/v1/` | 200 | PostgREST root |
| `/rest/v1/scholarships_safe_listing` | 200 | anon JWT via `apikey` |
| `/rest/v1/profiles` | 200 | anon → `[]`; service_role → ≥1 row |
| `/rest/v1/rpc/get_comparison_data` | 200 | anon RPC |
| `/storage/v1/*` | **503** | Documented hybrid — not deployed in test stack |

**Scholarships count (HEAD + `Prefer: count=exact`):** `content-range: 0-21107/21108` → **21108** active rows.

---

## JWT / RLS smoke

| Test | Result |
|------|--------|
| anon `scholarships_safe_listing` select | **PASS** |
| anon `profiles` | **PASS** — empty `[]` (RLS) |
| service_role `profiles` | **PASS** — ≥1 row |
| RPC `get_comparison_data` | **PASS** |

**JWT mode:** internal legacy JWT (`/root/.supabase-legacy-*-jwt-internal`). Production Dashboard JWT secret **not** installed yet — shadow tokens are **not** interchangeable with production `sb_publishable_*` keys.

**Follow-up (optional):** install Dashboard JWT via `install-supabase-jwt-secret.sh`, regenerate legacy JWTs, re-run smokes for full production token parity.

---

## supabase-js shadow compatibility

Script: `scripts/vps-migration/stage4c-supabase-js-shadow-smoke.mjs`  
Env: `/opt/scholarshiptop/env/shadow-api.env` (NOT `site.env`)

| Call | Result |
|------|--------|
| auth health | **PASS** |
| auth settings | **PASS** |
| `.from('scholarships_safe_listing').select()` | **PASS** |
| `.from('profiles').select()` (anon) | **PASS** — empty |
| service client `.from('profiles').select()` | **PASS** |
| `.rpc('get_comparison_data')` | **PASS** |

Custom `fetch` adds `Authorization: Basic …`; REST JWT travels in `apikey` header.

---

## Auth smoke (safe / non-production)

| Test | Result |
|------|--------|
| `/auth/v1/health` | **PASS** |
| `/auth/v1/settings` | **PASS** |
| Magic links / mass email | **skipped** |
| Existing production sessions | **not touched** |

---

## Storage status

`/storage/v1/object/public/test` → **503** with JSON message (hybrid CDN / not in Stage 4 stack). Production storage remains on hosted Supabase.

---

## Logs — production site isolation

Recent `scholarshiptop-site` logs: **no** references to `vps-shadow-supabase-4c`. Production app continues to use hosted Supabase URL from `site.env`.

---

## RAM / CPU after public shadow

| Metric | Value |
|--------|-------|
| Memory | 3.8 GiB total, ~2.2 GiB used, ~1.6 GiB available |
| Swap | 128 MiB used / 4 GiB |
| Load average | ~0.58, 0.52, 0.46 |
| Containers | `nginx`, `site`, `gotrue-test`, `postgrest-test`, `supabase-api-gateway-test` all up |

---

## Production smoke (post Stage 4C)

| URL | HTTP |
|-----|------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |

---

## Tooling added (repo)

| File | Purpose |
|------|---------|
| `ops/vps/nginx/includes/scholarshiptop-shadow-supabase-api.conf.example` | Shadow nginx locations |
| `ops/vps/scripts/setup-shadow-supabase-api-nginx.sh` | Deploy htpasswd + shadow env + reload |
| `ops/vps/scripts/install-supabase-jwt-secret.sh` | Install Dashboard JWT to `/root/.supabase-jwt-secret` |
| `ops/vps/scripts/generate-legacy-supabase-jwt.sh` | Legacy `eyJ…` anon/service JWTs |
| `ops/vps/scripts/diagnose-jwt-secret-sources.sh` | JWT file inventory (no values) |
| `ops/env/shadow-api.env.example` | Shadow env template |
| `scripts/vps-migration/stage4c-public-shadow-smoke.sh` | Public curl smoke |
| `scripts/vps-migration/stage4c-supabase-js-shadow-smoke.mjs` | supabase-js shadow smoke |
| `ops/vps/docker-compose.yml` | nginx on `supabase_api_test` network |

**VPS-only (not in git):** `/opt/scholarshiptop/env/shadow-api.env`, `/opt/scholarshiptop/nginx/includes/shadow-api.htpasswd`

---

## Runbook (VPS)

```bash
# Deploy / refresh shadow route (generates new basic-auth password)
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/setup-shadow-supabase-api-nginx.sh --apply

# Smokes
sudo bash /opt/scholarshiptop/app/scripts/vps-migration/stage4c-public-shadow-smoke.sh
sudo bash -c 'cd /opt/scholarshiptop/app && node scripts/vps-migration/stage4c-supabase-js-shadow-smoke.mjs'
```

---

## Commit

`dab6cb5` — Stage 4C: public shadow Supabase API route, smokes, and report (safe files only; no VPS secrets).
