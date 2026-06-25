# Stage 6E — Post-cutover auth/UI audit and fixes

**Дата:** 2026-06-25  
**VPS:** `213.155.22.74`  
**Контекст:** Stage 6B cutover complete (self-host Supabase); Stage 6C monitoring `PASS_WITH_WARNINGS`.  
**User-reported issues:** (1) logout button does not work; (2) login with `loomany.self@mail.ru` shows error popup.

## Verdict: **PASS_WITH_WARNINGS**

- **Logout:** root cause identified and **fixed** + deployed to production.
- **Login popup for `loomany.self@mail.ru`:** root cause identified — **not a code/schema bug**; GoTrue returns `invalid_credentials` (password mismatch). Account is healthy in VPS DB. **Not auto-fixed** (would require owner-approved password reset; SMTP not configured on self-host GoTrue).

---

## Root cause — logout does not work

### Symptoms
- Navbar “Sign out” (`NavbarUserSlot`) and account page “Log out” (`ScholarshipProfileForm`) appeared to do nothing: user still looked logged in after click.

### Investigation
| Check | Result |
|-------|--------|
| Click handler fires | **Yes** — `onClick` → `supabase.auth.signOut()` |
| GoTrue `/logout?scope=global` | **204** (API works; throwaway test user) |
| `signOut()` alone clears only current cookie name | **Yes** — `@supabase/ssr` uses `storageKey: cookieOptions.name` derived from Supabase URL hostname |
| Cookie name after cutover | `sb-scholarshiptop-auth-token` (self-host: `scholarshiptop.com/supabase`) |
| Stale cookie from hosted era | `sb-qlqlvhgosxhuibzhfsnh-auth-token` (old `*.supabase.co` project ref) — **not cleared** by `signOut()` |
| Middleware `hasSupabaseAuthCookie` | Matches **any** `sb-*-auth-token` cookie → stale cookie keeps session refresh path alive |
| Client handler after signOut | Only `router.refresh()` — **soft navigation** can race cookie removal; no hard redirect, no stale-cookie sweep |
| Error handling | **None** — thrown `signOut` leaves UI stuck |

### Root cause (concise)
**Post-migration stale Supabase auth cookies** from the hosted project (`sb-<oldRef>-auth-token`) are not removed by `signOut()`, which only clears cookies for the **current** self-host client. Middleware still sees auth cookies → server/user state appears logged in. Combined with `router.refresh()` only (no hard redirect / no cookie sweep), logout feels broken.

---

## Root cause — `loomany.self@mail.ru` login popup

### Symptoms
- Password sign-in shows error popup (“Sign in failed.”) via `getErrorRedirect` in `signInWithPasswordClient`.

### Investigation
| Check | Result |
|-------|--------|
| Endpoint | `POST /supabase/auth/v1/token?grant_type=password` |
| HTTP status | **400** |
| GoTrue `error_code` | **`invalid_credentials`** |
| Response message (sanitized) | `Invalid login credentials` |
| User exists in VPS `auth.users` | **Yes** |
| `email_confirmed_at` | **Set** |
| `encrypted_password` | **Present** (`$2a$` bcrypt prefix) |
| `banned_until` / `deleted_at` | **Not set** |
| Identity provider | **email** (not Google-only) |
| `public.profiles` row | **Exists** |
| GoTrue SMTP / mailer | **Not configured** (only `GOTRUE_MAILER_AUTOCONFIRM=true`; no `GOTRUE_SMTP_*`) |
| Forgot-password email flow | **Unavailable** until SMTP approved |

### Root cause (concise)
**Wrong password for this account on the VPS auth store**, not a migration/schema/UI bug. GoTrue correctly rejects with `invalid_credentials`. The popup is expected app behaviour (`getErrorRedirect`). Password reset via email is **not available** on self-host until SMTP is configured (separate approved stage).

**Note:** 152 users in DB have empty `encrypted_password` (OAuth-only); this user is **not** one of them.

---

## What was changed

### Code (minimal, auth/UI/session scoped)

1. **`utils/auth-helpers/client.ts`**
   - Added `clearAllSupabaseAuthCookies()` — expires all `sb-*-auth-token` cookies (including chunked `.0`, `.1`, …) visible to `document.cookie`, with host + apex domain fallbacks. Clears **stale hosted-project cookies** after migration.
   - Added `signOutAndRedirect()` — `signOut()` (try/catch), cookie sweep, `window.location.assign()` hard redirect.

2. **`components/ui/Navbar/NavbarUserSlot.tsx`**
   - Navbar sign-out now uses `signOutAndRedirect('/')` instead of `signOut()` + `router.refresh()`.

3. **`components/ui/AccountForms/ScholarshipProfileForm.tsx`**
   - Account “Log out” now uses `signOutAndRedirect('/')`.

### Production deploy
- Patched 3 files into `/opt/scholarshiptop/app` snapshot (backup: `/opt/scholarshiptop/backups/stage6e-src-<TS>/`).
- Rebuilt via `host-build-site.sh` (no `git pull`), **rc=0**.
- `scholarshiptop-site` container recreated, **healthy**.
- Brief site recreate downtime (~30–60s) during container swap only; no `site.env`/parser/DB changes.

### Not changed (per constraints)
- `site.env`, parser env/services, hosted Supabase, Railway, GoTrue SMTP, nginx, middleware logic.

---

## Files changed

| File | Change |
|------|--------|
| `utils/auth-helpers/client.ts` | `clearAllSupabaseAuthCookies`, `signOutAndRedirect` |
| `components/ui/Navbar/NavbarUserSlot.tsx` | Use `signOutAndRedirect` for navbar logout |
| `components/ui/AccountForms/ScholarshipProfileForm.tsx` | Use `signOutAndRedirect` for account logout |
| `reports/vps-migration/31-stage6e-post-cutover-auth-ui-audit-fix-2026-06-25.md` | This report |

---

## Tests / smoke result

| Test | Result |
|------|--------|
| `GET /` | **200** |
| `GET /sitemap.xml` | **200** |
| 3 scholarship detail pages | **200 × 3** |
| `/supabase/health` | **200** |
| `/supabase/auth/v1/health` | **200** |
| Auth smoke (`stage5c1-auth-smoke.mjs`) | **STAGE_5C1_AUTH_PASS** (signUp/signIn/getUser/refresh/signOut/cleanup) |
| Parsers 3/3 | **active**, env **SELFHOST** |
| Bundle `NEXT_PUBLIC` hosted project refs (`*.supabase.co` in client chunks) | **0** in runtime client chunks; 3 matches in SDK JSDoc examples inside server chunk sources (benign) |
| Bundle self-host refs | **11** |
| Build | **rc=0** |
| Logout UI (browser E2E) | **Not run by agent** — fix is code+API validated; owner should confirm one click logout in browser |

---

## Production redeployed?

**Yes** — `host-build-site.sh` at ~`2026-06-25T19:38Z`; site container healthy.

---

## Rollback recommended?

**No.** Cutover remains valid. Logout fix is low-risk and scoped. Login issue is credential-level, not infrastructure.

**Optional follow-ups (require separate approval):**
1. Owner verifies logout in browser (clear stale cookies once via new button, then normal logout).
2. For `loomany.self@mail.ru`: re-enter correct password, or approve **single-user password reset** (DB or SMTP setup + forgot-password flow).
3. Stage to configure GoTrue SMTP if email reset/magic-link is desired on self-host.

---

## Hard constraints confirmation

| Constraint | Status |
|------------|--------|
| Cutover not rolled back | **YES** |
| Parser env/services untouched | **YES** |
| Hosted Supabase untouched | **YES** |
| Railway untouched | **YES** |
| Secrets not printed | **YES** |
| No env/secrets committed | **YES** |
