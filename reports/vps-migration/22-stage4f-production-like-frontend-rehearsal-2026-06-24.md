# Stage 4F — Production-like frontend rehearsal against VPS self-host Supabase API

**Дата:** 2026-06-24  
**VPS:** `213.155.22.74`  
**Scope:** `npm run build` + `npm run start` на отдельном порту против localhost self-host Supabase API без изменения production.

## Verdict: **STAGE_4F_PROD_LIKE_REHEARSAL_PASS_WITH_WARNINGS**

| Area | Result |
|------|--------|
| Production-like build (`npm run build` + staging env) | **PASS** |
| Rehearsal server (`npm run start` :3101) | **PASS** |
| Page smoke | **PASS** (8 routes + 3 scholarship details) |
| Auth smoke (`stage4f-frontend-rehearsal-auth.mjs`) | **PASS_WITH_WARNINGS** |
| `refreshSession` | **WARN** (schema limitation) |
| Playwright UI sign-in | **WARN** (browser CORS to localhost API) |
| Production site | **unchanged** |

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| Production `site.env` not modified | **PASS** |
| Production container not replaced | **PASS** (`scholarshiptop-site` still running) |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No cutover / dual-write | **PASS** |
| Storage hybrid/read-only | **PASS** |
| No secrets in git/logs | **PASS** |

---

## Rehearsal setup

| Component | Value |
|-----------|-------|
| Env file | `/opt/scholarshiptop/env/site.stage4e.env` (reused from Stage 4E) |
| Supabase API | `http://127.0.0.1:54321` (localhost gateway, no public Basic Auth) |
| Rehearsal server | `http://127.0.0.1:3101` (`npm run start`, separate PID) |
| Production site | `https://scholarshiptop.com` → hosted Supabase via `site.env` |

**Env overrides (rehearsal only):** `NEXT_PUBLIC_SUPABASE_URL`, legacy anon/service JWT from VPS files; storage keys copied from production `site.env`.

---

## Build / start result

| Step | Result |
|------|--------|
| `npm run build` with staging env | **PASS** (first run; `NODE_OPTIONS=--max-old-space-size=1536`) |
| `npm run start` on port 3101 | **PASS** |
| Production container/port 3000 | **untouched** |

**Note:** Host `.next` is separate from the production Docker image (`scholarshiptop-site:staging` / `Dockerfile.prebuilt`). Rehearsal build does not replace the production container filesystem.

---

## Page smoke (production-like server)

| Page | HTTP | Result |
|------|------|--------|
| `/` | 200 | **PASS** |
| `/sitemap.xml` | 200 | **PASS** |
| `/scholarships` | 200 | **PASS** |
| `/resources` | 200 | **PASS** |
| `/compare` | 200 | **PASS** |
| 3× scholarship detail (from `sitemaps/scholarships-0.xml`) | 200 | **PASS** |
| `/signin/password_signin` | 200 | **PASS** |
| `/account` (unauthenticated) | 307 | **PASS** |

Scholarship URLs discovered from sitemap index → `sitemaps/scholarships-0.xml` (not hardcoded fallbacks).

---

## Auth flows (production-like server, `@supabase/ssr`)

| Flow | Result |
|------|--------|
| `signUp` | **PASS** |
| `auth.getUser` | **PASS** |
| Session cookies | **PASS** (count=1) |
| `/account` SSR after signUp | **PASS** (200) |
| `profiles` upsert | **PASS** |
| `signOut` | **PASS** |
| `/account` redirect after signOut | **PASS** |
| `signInWithPassword` | **PASS** |
| `/account` SSR after signIn | **PASS** (200) |

### Test user cleanup

| Metric | Before | After |
|--------|--------|-------|
| `auth.users` | 555 | 555 |
| `auth.identities` | 566 | 566 |
| `public.profiles` | 550 | 550 |

Email pattern: `shadow-stage4f+<timestamp>@invalid.scholarshiptop.test` — **deleted**.

---

## refreshSession result

**Status:** **WARN — not observed**

**Exact blocker:** `missing destination name oauth_client_id in *models.Session`

**Root cause:** Restored shadow GoTrue/Postgres schema is missing the `oauth_client_id` field expected by the current GoTrue session model (same as Stage 4D/4E).

**Safe fix plan (shadow DB only, non-destructive):**

1. Inspect `auth.sessions` on shadow VPS DB vs GoTrue version in `scholarshiptop-gotrue-test`.
2. If column absent, add nullable `oauth_client_id` (and any companion columns GoTrue release notes require) via **shadow-only migration** — no changes to hosted Supabase.
3. Re-run `refreshSession` smoke on internal gateway.
4. Do **not** drop or truncate `auth.sessions`; additive DDL only.

---

## UI sign-in result (Playwright)

**Status:** **WARN — stayed on `/signin/password_signin`**

**Root cause (confirmed):** Browser **CORS** blocks client-side `signInWithPassword` from `http://127.0.0.1:3101` to `http://127.0.0.1:54321`:

```
Access to fetch at 'http://127.0.0.1:54321/auth/v1/token?grant_type=password'
from origin 'http://127.0.0.1:3101' has been blocked by CORS policy
```

**Why SSR auth passes but UI fails:**

| Path | Mechanism | CORS |
|------|-----------|------|
| `@supabase/ssr` smoke | Server-side Node fetch to GoTrue | N/A |
| Password sign-in form | Client `createClient()` → browser fetch | **Blocked** |

**Not the cause:** middleware, cookie domain, form handler, or redirect logic — client never receives tokens due to CORS preflight failure.

**Safe fix plan for future UI rehearsal (staging only):**

1. Add `http://127.0.0.1:3101` (and rehearsal port) to Kong/GoTrue CORS allowlist on **shadow stack only**.
2. Alternatively, route browser auth through a Next.js same-origin API proxy for rehearsal (staging-only; not for production cutover without review).
3. Do **not** block cutover planning on UI Playwright — SSR/server auth path is the production-relevant validation.

---

## Production smoke

| URL | HTTP |
|-----|------|
| `https://scholarshiptop.com/` | **200** (preflight + post-rehearsal) |
| `https://scholarshiptop.com/sitemap.xml` | **200** |

**Production logs:** no `/vps-shadow-supabase-4c/`, no `127.0.0.1:54321`.

---

## RAM / CPU comparison

| Phase | Mem available | Load average | Notes |
|-------|---------------|--------------|-------|
| Stage 4E preflight (dev) | ~315 MiB | 0.31, 0.43, 1.63 | `npm run dev` + compile |
| Stage 4E post-run | ~815 MiB | 5.65, 6.29, 6.38 | High load during dev compile |
| Stage 4F after build | ~2938 MiB | 4.38, 37.07, 54.08 | Build spike; then settles |
| Stage 4F after start | ~2848 MiB | — | `next start` lighter than dev |
| Stage 4F final | ~1852 MiB | 2.45, 2.69, 16.38 | Rehearsal stopped |

**Conclusion:** Production-like `build` + `start` uses less sustained RAM than `npm run dev` on 3.8 GiB VPS. Build still causes a temporary load spike; recommend **≥4 GiB RAM or swap** before any cutover rehearsal at scale.

---

## Service logs

| Service | Result |
|---------|--------|
| Rehearsal site | `/opt/scholarshiptop/logs/stage4f-site.log` |
| Build | `/opt/scholarshiptop/logs/stage4f-build.log` |
| GoTrue | no fatal/panic |
| PostgREST | no fatal/panic |
| Gateway (`scholarshiptop-supabase-api-gateway-test`) | no fatal/panic |

---

## Artifacts

| Path | Purpose |
|------|---------|
| `scripts/vps-migration/stage4f-production-like-frontend-rehearsal.sh` | Orchestrator |
| `scripts/vps-migration/stage4f-frontend-rehearsal-auth.mjs` | SSR auth smoke |
| `scripts/vps-migration/stage4f-frontend-rehearsal-ui-signin.mjs` | Playwright + CORS diagnostics |
| `/opt/scholarshiptop/logs/stage4f-frontend-rehearsal.json` | Auth JSON (VPS, chmod 600) |

---

## Commit hash

`ee80c33` — `feat(vps): Stage 4F production-like frontend rehearsal against self-host API`
