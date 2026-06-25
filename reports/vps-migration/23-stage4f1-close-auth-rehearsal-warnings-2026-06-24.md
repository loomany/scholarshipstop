# Stage 4F.1 — Close frontend rehearsal blockers before cutover runbook

**Дата:** 2026-06-24  
**VPS:** `213.155.22.74`  
**Scope:** закрыть CORS + `refreshSession` warnings из Stage 4F без изменения production.

## Verdict: **STAGE_4F1_READY_FOR_CUTOVER_RUNBOOK**

| Area | Result |
|------|--------|
| CORS fix (shadow gateway + GoTrue allowlist) | **PASS** |
| Playwright UI sign-in | **PASS** |
| `refreshSession` | **PASS** (after GoTrue upgrade) |
| Auth SSR smoke | **PASS** |
| Production site | **unchanged** |

Final orchestration log: `STAGE_4F1_PASS_WITH_WARNINGS (1)` — transient `auth.users` count check during UI cleanup; post-run count **555** (baseline restored, no orphan test users).

---

## Hard constraints — confirmed

| Constraint | Status |
|------------|--------|
| Production site not switched | **PASS** |
| Production `site.env` not modified | **PASS** |
| Production container not replaced | **PASS** |
| Parsers not switched | **PASS** |
| Hosted Supabase not modified/deleted | **PASS** |
| No cutover / dual-write | **PASS** |
| No secrets in git/logs | **PASS** |

---

## 1. CORS fix result

**Problem (Stage 4F):** browser `signInWithPassword` from `http://127.0.0.1:3101` blocked on preflight/POST to `http://127.0.0.1:54321/auth/v1/token`.

**Fix (shadow stack only):**

| Change | File |
|--------|------|
| Rehearsal origins in `GOTRUE_URI_ALLOW_LIST` | `ops/vps/scripts/setup-supabase-api-env.sh` |
| nginx CORS for `127.0.0.1:3100/3101` on `/auth/v1/` | `ops/vps/nginx/includes/scholarshiptop-supabase-api-locations.example.conf` |
| `proxy_hide_header` to avoid duplicate GoTrue CORS headers | same nginx include |
| Gateway force-recreate on patch | `ops/vps/scripts/patch-shadow-rehearsal-auth-compat.sh` |

**Verification:**

```
OPTIONS /auth/v1/token Origin: http://127.0.0.1:3101 → 204
Access-Control-Allow-Origin: http://127.0.0.1:3101
POST /auth/v1/token → Access-Control-Allow-Origin: http://127.0.0.1:3101
```

Production public API (`https://scholarshiptop.com`) **not** opened for shadow rehearsal.

---

## 2. UI sign-in result

| Check | Result |
|-------|--------|
| Form submit leaves `/signin/password_signin` | **PASS** → `/scholarships/hub/best-recommendation` |
| Auth cookie present | **PASS** |
| `/account` in browser | **PASS** (200) |

**Root cause was:** CORS header conflict (GoTrue + nginx) and client bundle needing staging `NEXT_PUBLIC_*` (build with `site.stage4e.env`, `.env.production` temporarily moved aside).

---

## 3. refreshSession result

| Attempt | GoTrue | Result |
|---------|--------|--------|
| Stage 4F | v2.171.0 | **WARN** `oauth_client_id` missing in `*models.Session` |
| Stage 4F.1 | v2.181.0 | **WARN** `scopes` missing in `*models.Session` |
| Stage 4F.1 | **v2.184.0** | **PASS** `refreshSession ok` |

**Root cause:** Restored `auth.sessions` schema is **ahead** of GoTrue v2.171 Session model (`oauth_client_id`, `scopes`, `refresh_token_hmac_key`, etc.). v2.171 `SELECT *` fails on scan — not missing DB column.

**DB DDL applied (idempotent, shadow only):**

```sql
ALTER TABLE auth.sessions ADD COLUMN IF NOT EXISTS oauth_client_id uuid;
CREATE INDEX IF NOT EXISTS sessions_oauth_client_id_idx ON auth.sessions (oauth_client_id);
```

Column **already existed** on VPS — DDL was no-op. **Primary fix: GoTrue v2.184.0** with `command: ["gotrue", "serve"]` (no destructive DDL).

---

## 4. DB schema changes

| Object | Change | Destructive |
|--------|--------|-------------|
| `auth.sessions.oauth_client_id` | `ADD COLUMN IF NOT EXISTS` (no-op) | **No** |
| `sessions_oauth_client_id_idx` | `CREATE INDEX IF NOT EXISTS` (no-op) | **No** |
| Test DB `scholarshiptop_auth_test` | same idempotent DDL first | **No** |

**Counts before/after:**

| Table | Before | After |
|-------|--------|-------|
| `auth.users` | 555 | 555 |
| `auth.identities` | 566 | 566 |
| `public.profiles` | 550 | 550 |

---

## 5. Minimal Stage 4F.1 rehearsal smoke

| Step | Result |
|------|--------|
| `npm run build` (staging env, `.env.production` aside) | **PASS** |
| `npm run start` :3101 | **PASS** |
| Page smoke (/, sitemap, listing, signin) | **PASS** |
| Auth SSR (`stage4f1-rehearsal-auth.mjs`) | **PASS** incl. `refreshSession` |
| UI sign-in (`stage4f1-rehearsal-ui-signin.mjs`) | **PASS** |
| Test user cleanup | **PASS** |

---

## Production smoke

| URL | HTTP |
|-----|------|
| `https://scholarshiptop.com/` | **200** |
| `https://scholarshiptop.com/sitemap.xml` | **200** |

Production logs: no `127.0.0.1:54321`, no `/vps-shadow-supabase-4c/`.

---

## RAM / CPU (final run)

| Metric | Value |
|--------|-------|
| Memory available | ~1.4 GiB |
| Load average | elevated during `npm run build`, settles after `next start` |

---

## Artifacts

| Path | Purpose |
|------|---------|
| `ops/vps/scripts/patch-shadow-rehearsal-auth-compat.sh` | Apply CORS + GoTrue upgrade + DDL |
| `ops/vps/sql/stage4f1-shadow-sessions-oauth-client-id.sql` | Idempotent shadow DDL |
| `scripts/vps-migration/stage4f1-close-auth-rehearsal-warnings.sh` | Orchestrator |
| `scripts/vps-migration/stage4f1-rehearsal-auth.mjs` | SSR + refreshSession smoke |
| `scripts/vps-migration/stage4f1-rehearsal-ui-signin.mjs` | Playwright UI smoke |

---

## Commit hash

`9875c79` — `feat(vps): Stage 4F.1 close rehearsal CORS and refreshSession blockers`
