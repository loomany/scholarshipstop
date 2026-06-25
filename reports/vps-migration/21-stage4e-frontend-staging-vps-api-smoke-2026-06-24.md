# Stage 4E — Frontend staging smoke against VPS self-host Supabase API

**Дата:** 2026-06-24  
**VPS:** `213.155.22.74`  
**Scope:** Next.js site в staging/preview режиме против localhost self-host Supabase API без переключения production.

## Verdict: **STAGE_4E_FRONTEND_STAGING_PASS_WITH_WARNINGS**

| Area | Result |
|------|--------|
| Staging env (`site.stage4e.env`) | **PASS** |
| Frontend page smoke (localhost:3100) | **PASS** (with transient dev-server retries) |
| Auth smoke (`stage4e-frontend-staging-auth.mjs`) | **STAGE_4E_FRONTEND_STAGING_AUTH_PASS_WITH_WARNINGS** |
| Playwright UI sign-in (optional) | **WARN** (stayed on `/signin`; SSR path is primary) |
| Production site | **unchanged** |

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| Production `site.env` not modified | **PASS** |
| `NEXT_PUBLIC_SUPABASE_URL` in production still hosted `*.supabase.co` | **PASS** |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No cutover / dual-write | **PASS** |
| Storage hybrid/read-only | **PASS** (hosted storage keys copied from `site.env`) |
| No secrets in git/logs | **PASS** |

---

## Staging scheme (Basic Auth conflict resolution)

**Chosen: Option A — localhost-only staging site + localhost API**

| Component | Value |
|-----------|-------|
| Staging Next.js | `http://127.0.0.1:3100` (`npm run dev`, separate PID, not production container) |
| Staging Supabase API | `http://127.0.0.1:54321` (internal self-host gateway, no nginx Basic Auth) |
| Staging env file | `/opt/scholarshiptop/env/site.stage4e.env` (chmod 600, VPS only) |
| Public shadow path `/vps-shadow-supabase-4c/` | **not used** for frontend Bearer/session flows |

**Why:** Public shadow route uses HTTP Basic Auth on the same `Authorization` header Supabase client needs for `Bearer` JWT. Frontend staging therefore uses localhost-only API to avoid the conflict.

**Env overrides (staging only):**

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = legacy anon JWT (VPS file, not in git)
- `SUPABASE_SERVICE_ROLE_KEY` = legacy service_role JWT (VPS file, not in git)
- All other keys copied from production `site.env` (storage remains hosted/hybrid)

Template in repo: `ops/env/site.stage4e.env.example`

---

## Frontend page smoke (staging site)

| Page | HTTP | Result |
|------|------|--------|
| `/` (homepage) | 200 | **PASS** |
| `/sitemap.xml` | 200 | **PASS** |
| `/scholarships` (listing) | 200 | **PASS** |
| `/resources` (SEO hub) | 200 | **PASS** |
| `/compare` | 200 | **PASS** |
| `/scholarships/engineering-foundation-year-bursaries-at-university-college-london-2026-engineering-foundation-year-burs` | 200 | **PASS** |
| `/signin/password_signin` | 200 | **PASS** |
| `/account` (unauthenticated) | 307 → signin | **PASS** (expected redirect) |

**Note:** Under `npm run dev` on a 3.8 GiB VPS, first request to a route may return transient `000` while Next.js compiles; orchestrator retries succeeded without changing production.

---

## Auth flows via frontend (`@supabase/ssr`)

**Script:** `scripts/vps-migration/stage4e-frontend-staging-auth.mjs`  
**Pattern:** `createServerClient` cookie jar + `fetch /account` (middleware/SSR path)

| Flow | Result |
|------|--------|
| `signUp` (password) | **PASS** |
| `auth.getUser` after signUp | **PASS** |
| `profiles` upsert (`country_code`) | **PASS** |
| Session cookies set | **PASS** (count=1) |
| `/account` SSR after signUp | **PASS** (200) |
| `refreshSession` | **WARN** — skipped (`missing destination name oauth_client_id in *models.Session`, same as Stage 4D) |
| `signOut` | **PASS** |
| `/account` after signOut | **PASS** (redirect to signin) |
| `signInWithPassword` | **PASS** |
| `auth.getUser` after signIn | **PASS** |
| `/account` SSR after signIn | **PASS** (200) |

### Test user

| Item | Value |
|------|-------|
| Email pattern | `shadow-stage4e+<timestamp>@invalid.scholarshiptop.test` |
| Cleanup | **deleted** (`shadow-stage4e%`, `shadow-stage4e-ui%`) |
| `auth.users` baseline | 555 → 555 (**restored**) |

### Cookie / session result

| Check | Result |
|-------|--------|
| Supabase SSR session cookie after signUp | **present** |
| Production browser cookies | **not touched** |
| Production site session | **unchanged** |

### refreshSession result

**Not observed** — GoTrue restored schema lacks `oauth_client_id` on session model (known shadow-stack limitation from Stage 4D).

### Storage status

**Unchanged hybrid/read-only** — staging env copies hosted storage configuration from `site.env`; no storage cutover or write path to self-host storage.

---

## Optional Playwright UI sign-in

| Check | Result |
|-------|--------|
| Form submit on `/signin/password_signin` | **WARN** — stayed on signin page after submit |
| Primary auth validation | **SSR path above** (PASS) |

Playwright failure is attributed to dev-server latency/form-action timing; not blocking Stage 4E.

---

## Production smoke

| URL | HTTP |
|-----|------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |

**Production logs (last 30m):**

- No references to `/vps-shadow-supabase-4c/`
- No references to `127.0.0.1:54321`

---

## Service logs (staging stack)

| Service | Result |
|---------|--------|
| GoTrue (`scholarshiptop-gotrue-test`) | no fatal/panic |
| PostgREST (`scholarshiptop-postgrest-test`) | no fatal/panic |
| Staging site log | `/opt/scholarshiptop/logs/stage4e-site.log` |
| Nginx | not used for staging frontend path (localhost only) |

---

## RAM / CPU after staging run

| Metric | Value |
|--------|-------|
| Memory | 3.8 GiB total, ~815 MiB available |
| Load average | 5.65, 6.29, 6.38 |

Elevated load expected while `npm run dev` compiles routes alongside production containers.

---

## Artifacts

| Path | Purpose |
|------|---------|
| `scripts/vps-migration/stage4e-frontend-staging-vps-api-smoke.sh` | Orchestrator |
| `scripts/vps-migration/stage4e-frontend-staging-auth.mjs` | SSR auth smoke |
| `scripts/vps-migration/stage4e-frontend-staging-ui-signin.mjs` | Optional Playwright |
| `scripts/vps-migration/stage4e-debug-staging-signup.mjs` | Debug helper (VPS only) |
| `ops/env/site.stage4e.env.example` | Safe env template |
| `/opt/scholarshiptop/logs/stage4e-frontend-smoke.json` | Auth JSON result (VPS, chmod 600) |

---

## Safe commit

See git commit hash in section below (scripts + example env + this report only; no `site.stage4e.env`, JWTs, or dumps).

---

## Commit hash

`347fbe3` — `feat(vps): Stage 4E frontend staging smoke against self-host API`
