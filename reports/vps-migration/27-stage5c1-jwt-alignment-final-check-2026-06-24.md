# Stage 5C.1 — JWT alignment final check before real cutover

**Дата:** 2026-06-24
**VPS:** `213.155.22.74`
**Scope:** Option B — align self-host gateway JWT with hosted Dashboard secret. **site.env not changed.**

## Verdict: **STAGE_5C1_JWT_ALIGNMENT_READY_PASS_WITH_WARNINGS (1)**

Gateway JWT alignment complete. REST/auth/supabase-js smoke pass on `https://scholarshiptop.com/supabase` with legacy JWT keys. One expected warning: production `sb_publishable_*` keys are not accepted by self-host PostgREST — cutover requires swapping API keys to legacy JWT (documented below).

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| `site.env` not changed | **PASS** |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| Real cutover not executed | **PASS** |
| No dual-write | **PASS** |
| No secrets committed/printed | **PASS** |

Only **gateway** files changed: `supabase-api.env`, `/root/.supabase-legacy-*-jwt`, `site.cutover-preview.env` (preview only).

---

## JWT option used

**Option B** — install hosted production Dashboard JWT secret into self-host gateway:

| Step | Result |
|------|--------|
| Source secret | `/root/.supabase-jwt-secret` (Dashboard JWT secret, installed Stage 4C.1) |
| Regenerate legacy JWT | `generate-legacy-supabase-jwt.sh` → `/root/.supabase-legacy-anon-jwt` + `service` |
| Rebuild gateway env | `setup-supabase-api-env.sh` → `JWT_MODE=production` |
| Sync JWT lines | `sync-gateway-jwt-secrets.sh` (ensures PGRST/GOTRUE/JWT_SECRET match file) |
| Restart | API stack only (`gotrue` + `postgrest` + gateway); **force-recreate** postgrest/gotrue |
| Preview env | `/opt/scholarshiptop/env/site.cutover-preview.env` (NOT production) |

---

## Gateway JWT mode

| Component | Mode | Detail |
|-----------|------|--------|
| `supabase-api.env` `JWT_MODE` | **production** | Dashboard secret |
| GoTrue `GOTRUE_JWT_SECRET` | **aligned** | matches `/root/.supabase-jwt-secret` |
| PostgREST `PGRST_JWT_SECRET` | **aligned** | functional REST probe **200** (after force-recreate) |
| Legacy anon JWT | **valid** | `role=anon iss=supabase ref=qlqlvhgosxhuibzhfsnh` |

**Note:** `docker exec printenv PGRST_JWT_SECRET` is unreliable on this image (misreports length). Use functional REST probe instead.

---

## anon / service_role REST smoke (`/supabase`, legacy JWT)

| Check | Result |
|-------|--------|
| `/supabase/health` | **200** |
| `/supabase/auth/v1/health` | **200** |
| `scholarships_safe_listing` count | **21110** |
| anon `profiles` | **`[]`** |
| service_role `profiles` | **≥1 row** |
| RPC `get_comparison_data` | **200** |
| CORS `https://scholarshiptop.com` | **204** + correct ACAO |
| Foreign origin | **not echoed** |
| Storage `/supabase/storage/v1/*` | **503** hybrid |

---

## supabase-js cutover-preview smoke

**Env:** `site.cutover-preview.env` (URL `https://scholarshiptop.com/supabase` + legacy JWT keys)

| Check | Result |
|-------|--------|
| `scholarships_safe_listing` select | **PASS** |
| anon `profiles` empty | **PASS** |
| service `profiles` ≥1 | **PASS** |
| `get_comparison_data` RPC | **PASS** |

**Verdict:** `STAGE_5C1_JS_CUTOVER_PREVIEW_PASS`

---

## Auth smoke (VPS DB only, test user cleaned up)

| Flow | Result |
|------|--------|
| signUp | **PASS** |
| signInWithPassword | **PASS** |
| getUser | **PASS** |
| profiles upsert | **PASS** |
| refreshSession | **PASS** |
| signOut | **PASS** |
| cleanup test user | **PASS** |

**Verdict:** `STAGE_5C1_AUTH_PASS`

---

## WARN — `sb_publishable_*` keys vs self-host PostgREST

Production `site.env` uses `sb_publishable_*` / `sb_secret_*` gateway-format keys. Self-host PostgREST expects legacy `eyJ…` JWT in `Authorization: Bearer`.

| Key | Self-host `/supabase/rest` |
|-----|---------------------------|
| Legacy anon JWT (generated) | **200** |
| `site.env` sb_publishable anon | **401** |

**Cutover implication (Option B refined):**

At cutover window, `site.env` changes:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://scholarshiptop.com/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=<legacy anon JWT from /root/.supabase-legacy-anon-jwt>
SUPABASE_SERVICE_ROLE_KEY=<legacy service JWT from /root/.supabase-legacy-service-jwt>
```

**Option B benefit preserved:** gateway uses the **same Dashboard JWT secret** as hosted Supabase → **existing user session tokens remain valid** (no forced mass logout). Only the static API keys in `site.env` swap from `sb_publishable` → legacy JWT (one-time env edit at cutover).

---

## Production smoke (unchanged)

| Check | Result |
|-------|--------|
| `https://scholarshiptop.com/` | **200** |
| `/sitemap.xml` | **200** |
| `site.env` URL | still **hosted `*.supabase.co`** |
| Site logs calling `/supabase` | **none** |
| Parsers (3 active) | still **hosted Supabase** |

---

## Rollback (gateway JWT alignment only)

```bash
sudo cp /opt/scholarshiptop/backups/supabase-api.env.pre-stage5c1.<timestamp> \
  /opt/scholarshiptop/env/supabase-api.env
sudo bash /opt/scholarshiptop/app/ops/vps/scripts/restart-supabase-api-test-stack.sh
sudo docker compose -f /opt/scholarshiptop/app/ops/vps/docker-compose.supabase-api.example.yml \
  --profile supabase-api-test up -d --force-recreate postgrest gotrue
```

---

## Deliverables

| Path | Purpose |
|------|---------|
| `ops/vps/scripts/sync-gateway-jwt-secrets.sh` | Force-sync JWT secret lines in gateway env |
| `scripts/vps-migration/stage5c1-align-gateway-jwt.sh` | Option B alignment + full smoke |
| `scripts/vps-migration/stage5c1-cutover-js-smoke.mjs` | supabase-js cutover-preview smoke |
| `scripts/vps-migration/stage5c1-auth-smoke.mjs` | Auth flow smoke + cleanup |
| `reports/vps-migration/27-stage5c1-jwt-alignment-final-check-2026-06-24.md` | This report |

---

## Confirmation

Production site, production `site.env`, parsers, and hosted Supabase were **not changed**.

---

## Commit hash

`PLACEHOLDER`
