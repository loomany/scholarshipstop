# Stage 5C — Production no-Basic-Auth Supabase API route

**Дата:** 2026-06-24
**VPS:** `213.155.22.74`
**Scope:** подготовить production-ready nginx route для self-host Supabase API без Basic Auth. Сайт **не переключался**.

## Verdict: **STAGE_5C_API_ROUTE_READY**

Полный smoke (health / rest / rpc / RLS / CORS / storage / production) прошёл через публичный route с правильными legacy JWT-ключами. Перед реальным cutover остаётся **одна обязательная задача**: выровнять JWT secret / anon-service ключи сайта с секретом gateway (см. ниже).

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| `site.env` not changed | **PASS** |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified | **PASS** |
| Real cutover not executed | **PASS** |
| No dual-write | **PASS** |
| No secrets/tokens/URIs printed or committed | **PASS** |

The only change is an **additive nginx include + zero-downtime reload** (no container restart). The production Next.js app still talks to hosted Supabase via its baked `NEXT_PUBLIC_SUPABASE_URL`.

---

## 1. Production API URL / path

Base URL (for `NEXT_PUBLIC_SUPABASE_URL` **after** cutover, not set now):

```
https://scholarshiptop.com/supabase
```

supabase-js then resolves:

| Sub-path | Upstream | Auth |
|----------|----------|------|
| `https://scholarshiptop.com/supabase/auth/v1/*` | GoTrue | **no Basic Auth** |
| `https://scholarshiptop.com/supabase/rest/v1/*` | PostgREST (RLS) | **no Basic Auth** |
| `https://scholarshiptop.com/supabase/storage/v1/*` | — | `503` documented hybrid |
| `https://scholarshiptop.com/supabase/health` | gateway | open |

Path-prefix on the existing domain → reuses the Cloudflare Origin TLS cert; **no new DNS/subdomain/cert required**. Same-origin with the site, plus explicit CORS for cross-origin tooling.

**Why a path, not `api.` subdomain:** a subdomain needs Cloudflare DNS + cert SAN that cannot be wired purely from the VPS. The path route is immediately testable and production-safe.

---

## 2. No Basic Auth

The route has **no `auth_basic`** on `/rest/v1` or `/auth/v1`. Data is protected by Postgres **RLS + JWT** (anon/service_role) — same posture as a hosted Supabase anon endpoint. The old `/vps-shadow-supabase-4c/` basic-auth route is left intact and untouched.

---

## 3. CORS

Allowed origins (regex `^https://(www\.)?scholarshiptop\.com$`):
- `https://scholarshiptop.com`
- `https://www.scholarshiptop.com`

CORS is emitted at the production edge; conflicting upstream CORS headers are stripped via `proxy_hide_header`. Foreign origins are **not** echoed.

| Test | Result |
|------|--------|
| Preflight `OPTIONS` from `https://scholarshiptop.com` | **204**, `Access-Control-Allow-Origin: https://scholarshiptop.com` |
| Preflight from `https://evil.example.com` | ACAO **not** echoed |
| Public Cloudflare edge preflight | **204** + correct ACAO |

---

## 4. Auth / REST / RPC smoke (gateway-matching legacy JWT)

| Check | Result |
|-------|--------|
| `/supabase/health` | **200** |
| `/supabase/auth/v1/health` | **200** |
| `/supabase/rest/v1/` (no Basic Auth) | **200** |
| `/supabase/rest/v1/scholarships_safe_listing` count | **21110** (`content-range: 0-21109/21110`) |
| anon `profiles` | **`[]`** (RLS) |
| service_role `profiles` | **≥1 row** |
| RPC `get_comparison_data` | **200** |
| Storage `/supabase/storage/v1/*` | **503** (hybrid) |

> Count is 21110 (vs 21108 earlier) — normal data drift from parsers; not an issue.

---

## 5. Storage status

`/supabase/storage/v1/*` returns **503** with a documented hybrid message. Storage assets remain served by the **hosted Supabase CDN**; no blob migration in this stage.

---

## 6. Production smoke (unchanged)

| Check | Result |
|-------|--------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |
| `site.env` `NEXT_PUBLIC_SUPABASE_URL` | still **hosted `*.supabase.co`** |
| Site app logs referencing self-host API | **none** |

---

## 7. KEY FINDING — JWT secret alignment (cutover prerequisite)

During smoke, REST first returned **`PGRST301 JWSError`** with the staging keys. Isolation (direct gateway, direct PostgREST `:3001`, and through the route) proved the **route is correct** — the failure was a **key↔secret mismatch**:

| Key source | Against live PostgREST | Note |
|------------|------------------------|------|
| `site.stage4e.env` anon key | **401** (`Not valid base64url`) | likely a `sb_publishable_*` / hosted-format key, not the legacy JWT |
| `/root/.supabase-legacy-anon-jwt-internal` | **401** (`JWSInvalidSignature`) | older internal secret iteration |
| **`/root/.supabase-legacy-anon-jwt`** | **200** | **matches live gateway secret** |

The live gateway (`PGRST_JWT_SECRET` / `GOTRUE_JWT_SECRET` in `supabase-api.env`) uses the legacy secret `/root/.supabase-jwt-secret`. The matching tokens are `/root/.supabase-legacy-anon-jwt` and `/root/.supabase-legacy-service-jwt`.

**Cutover prerequisite (one of):**
- **Option A (re-key site):** set `site.env` `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` to the legacy JWTs matching the gateway secret. Side effect: **existing hosted-issued session cookies become invalid → users re-login once.**
- **Option B (re-key gateway, no forced logout):** install the **hosted production JWT secret** into the gateway (`GOTRUE_JWT_SECRET`/`PGRST_JWT_SECRET`) so existing hosted anon/service keys and live user sessions keep working seamlessly.

Recommended: **Option B** for a seamless cutover (no forced logout, minimal `site.env` change). Decide before the freeze window.

---

## 8. Rollback for this route (additive, safe)

The route is additive and does not affect existing production traffic. To remove:

```bash
# restore pre-stage5c site conf (backed up automatically)
sudo cp /opt/scholarshiptop/backups/scholarshiptop-site.conf.pre-stage5c.<timestamp> \
  /opt/scholarshiptop/nginx/conf.d/scholarshiptop-site.conf
sudo docker exec scholarshiptop-nginx nginx -t
sudo docker exec scholarshiptop-nginx nginx -s reload
```

Backup created this stage: `/opt/scholarshiptop/backups/scholarshiptop-site.conf.pre-stage5c.<timestamp>`.

---

## Final command reference

**Final dump / restore / site switch / parser switch / rollback:** unchanged from Stage 5B report (24/25). Cutover adds: **align JWT keys/secret (section 7)** before flipping `NEXT_PUBLIC_SUPABASE_URL` to `https://scholarshiptop.com/supabase`.

---

## Remaining risks

| Item | Status |
|------|--------|
| JWT secret / anon-service key alignment | **Prerequisite** — decide Option A vs B before cutover |
| Magic link / OAuth production callbacks | Not fully production-tested |
| Storage hybrid | Stays on hosted CDN |
| Public route now reachable | Intended; RLS+JWT protected, CORS-restricted |
| Owner / freeze-window approvals | Required (Stage 5B checklist) |

---

## Deliverables

| Path | Purpose |
|------|---------|
| `ops/vps/nginx/includes/scholarshiptop-production-supabase-api.conf` | Production no-Basic-Auth API route |
| `ops/vps/nginx/conf.d/scholarshiptop-site.conf` | Includes the new route (both server blocks) |
| `scripts/vps-migration/stage5c-deploy-and-smoke.sh` | Deploy + full smoke |
| `scripts/vps-migration/stage5c-inspect.sh` | Read-only topology inspection |
| `reports/vps-migration/26-stage5c-production-api-route-ready-2026-06-24.md` | This report |

---

## Confirmation

`site.env`, the production site container, parsers, and hosted Supabase were **not changed**. Only an additive nginx include + zero-downtime reload was applied. Production still serves hosted Supabase.

---

## Commit hash

`PLACEHOLDER`
