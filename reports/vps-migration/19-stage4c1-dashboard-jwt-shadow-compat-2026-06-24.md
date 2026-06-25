# Stage 4C.1 — Dashboard JWT shadow compatibility

**Дата:** 2026-06-24  
**VPS:** `213.155.22.74`  
**Scope:** проверка shadow Supabase-compatible API с **реальным Dashboard JWT secret** и legacy `eyJ…` anon/service_role JWT. **Без cutover.**

## Verdict: **STAGE_4C1_JWT_COMPAT_PASS**

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| `NEXT_PUBLIC_SUPABASE_URL` unchanged | **PASS** — hosted `*.supabase.co` |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No cutover / dual-write | **PASS** |
| Storage not migrated | **PASS** — `/storage/v1` → 503 |
| No secrets in git/logs | **PASS** |

---

## Dashboard JWT installation

| Item | Status |
|------|--------|
| `/root/.supabase-jwt-secret` | **installed** (chmod 600, value not recorded) |
| Legacy anon JWT file | **generated** (`/root/.supabase-legacy-anon-jwt`) |
| Legacy service_role JWT file | **generated** (`/root/.supabase-legacy-service-jwt`) |
| `supabase-api.env` `JWT_MODE` | **production** |
| Internal JWT in active env | **no** — `shadow-api.env` and `supabase-api.env` use production legacy files |

**Setup commands run on VPS:**

```bash
sudo bash ops/vps/scripts/install-supabase-jwt-secret.sh -
sudo bash ops/vps/scripts/generate-legacy-supabase-jwt.sh
sudo bash ops/vps/scripts/setup-supabase-api-env.sh
sudo bash ops/vps/scripts/refresh-shadow-api-jwt-keys.sh
sudo bash ops/vps/scripts/restart-supabase-api-test-stack.sh
```

`refresh-shadow-api-jwt-keys.sh` обновляет только JWT keys в `shadow-api.env`, сохраняя basic-auth password.

---

## Shadow endpoint smoke

**URL:** `https://scholarshiptop.com/vps-shadow-supabase-4c/` (basic auth + obscure path)

| Check | Result |
|-------|--------|
| `stage4c-public-shadow-smoke.sh` | **STAGE_4C_SHADOW_PASS** |
| `/health` | 200 |
| `/auth/v1/health` | 200 |
| `/auth/v1/settings` | 200 |
| `/rest/v1/scholarships_safe_listing` count | **21108** |
| anon `profiles` | `[]` |
| service_role `profiles` | ≥1 row |
| RPC `get_comparison_data` | 200 |
| `/storage/v1` | 503 (hybrid) |

---

## supabase-js shadow smoke

| Check | Result |
|-------|--------|
| `stage4c-supabase-js-shadow-smoke.mjs` | **STAGE_4C_JS_SHADOW_PASS** |
| `.from('scholarships_safe_listing').select()` | PASS |
| `.from('profiles').select()` anon | PASS (empty) |
| service client `profiles` | PASS |
| `.rpc('get_comparison_data')` | PASS |
| auth health / settings | PASS |

Uses `shadow-api.env` only — **not** production `site.env`.

---

## Localhost stack (PostgREST + GoTrue)

| Check | Result |
|-------|--------|
| `http://127.0.0.1:54321/health` | 200 |
| `/auth/v1/health` | 200 |
| `/auth/v1/settings` | 200 |
| scholarships count | 21108 |
| anon RLS profiles | `[]` |
| service_role profiles | ≥1 row |
| RPC | 200 |

---

## Auth health

| Endpoint | Result |
|----------|--------|
| `/auth/v1/health` | 200 |
| `/auth/v1/settings` | 200 |
| Login / magic links | **not tested** (safe non-production policy) |

GoTrue logs after restart: no fatal errors observed.

---

## Production smoke

| URL | HTTP |
|-----|------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |
| 3 scholarship detail pages | **200** each |

**Site logs:** no references to `/vps-shadow-supabase-4c/` in last 30m.

---

## RAM / CPU after restart

| Metric | Value |
|--------|-------|
| Memory | 3.8 GiB total, ~1.2 GiB available |
| Load average | ~0.69, 0.47, 0.36 |
| Containers | `gotrue-test`, `postgrest-test`, `gateway-test`, `nginx`, `site` — up |

---

## Operational note

После `docker compose … down/up` для test stack nginx может кэшировать старый IP gateway → **502** на shadow path.  
Используйте `ops/vps/scripts/restart-supabase-api-test-stack.sh` (reconnect network + `nginx -s reload`).

---

## Tooling added (repo)

| File | Purpose |
|------|---------|
| `ops/vps/scripts/refresh-shadow-api-jwt-keys.sh` | Refresh shadow JWT keys without rotating basic auth |
| `ops/vps/scripts/restart-supabase-api-test-stack.sh` | Safe stack restart + nginx reload |
| `scripts/vps-migration/stage4c1-dashboard-jwt-shadow-compat-smoke.sh` | Full 4C.1 smoke orchestration |

---

## Commit

`COMMIT_HASH` — Stage 4C.1 Dashboard JWT compatibility scripts and report.
