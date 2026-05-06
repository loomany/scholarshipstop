# Runtime Audit: `cookies()` inside `unstable_cache` (`/api/scholarships`)

Generated: 2026-05-06  
Mode: read-only audit (no code changes)

## Executive verdict

- **Issue type:** Production-impact runtime misconfiguration (not just cosmetic warning).
- **Primary symptom:** `Route /api/scholarships used "cookies" inside a function cached with "unstable_cache(...)"`.
- **Current behavior:** Request does **not** crash (caught + fallback), but cache path is effectively invalid and repeatedly bypassed.
- **Severity:** **High** for authenticated scholarship-hub traffic (performance/egress), **Low** for guests.

---

## Affected files

- `app/api/scholarships/route.ts`
- `utils/supabase/server.ts`
- `app/scholarships/scholarshipListFetch.ts`
- `app/scholarships/ScholarshipsHubPageClient.tsx`
- `app/scholarships/scholarshipsSlugPathPageBody.tsx`
- `app/scholarships/scholarshipListServerPayload.ts` (context: SSR initial payload path)

---

## Exact flow (where it breaks)

1. Client queries hub list/meta via `postScholarshipsList()` / `postScholarshipsMeta()` in `app/scholarships/scholarshipListFetch.ts`.
2. Both hit `POST /api/scholarships` (`app/api/scholarships/route.ts`).
3. Route builds:
   - `cookieSupabase = createClient()`
   - `publicSupabase = createPublicClient()`
4. For personalized contexts (`includeMeta`, `meta_only`, personalized tabs, saved/ignored/etc with session), route calls:
   - `loadProfileForScholarshipsList(sessionUser.id, cookieSupabase)`
5. Inside `loadProfileForScholarshipsList`, cached function is:
   - `unstable_cache(async () => selectProfile(createClient()), ...)`
6. `createClient()` (`utils/supabase/server.ts`) internally calls `cookies()` from `next/headers`.
7. This is dynamic request data inside cache scope -> Next runtime warning/error path.
8. Catch block logs warning and falls back to direct read:
   - `selectProfile(requestSupabase)` (works functionally).

**Key point:** functionality survives, but intended cross-request cache is not reliable/effective on this path.

---

## Where `cookies()/headers()` are used inside cache scope

### Confirmed problematic usage

- `app/api/scholarships/route.ts`
  - `unstable_cache(async () => selectProfile(createClient() as any), ...)`
  - `createClient()` resolves to `utils/supabase/server.ts` -> `cookies()`.

### Related dynamic access (not inside this `unstable_cache` closure)

- `utils/supabase/server.ts` -> `cookies()` for server Supabase client.
- `app/scholarships/scholarshipsSlugPathPageBody.tsx` SSR bridge uses `createServerSupabase().auth.getUser()` and profile load, but **not** inside `unstable_cache` in the inspected path.

No other inspected `unstable_cache` sites showed this specific `cookies()`-inside-cache pattern for scholarship list runtime path.

---

## Handlers/functions/cache wrappers involved

- **Route handler:** `POST /api/scholarships` (`app/api/scholarships/route.ts`)
- **Wrapper:** `loadProfileForScholarshipsList()`
- **Cache wrapper:** `unstable_cache(...)` with key `['api-scholarships-profile', userId]`
- **Supabase clients:**
  - request-bound cookie client: `createClient()` (dynamic cookies)
  - public client: `createPublicClient()`
- **Meta/list callers:**
  - list query path (`postScholarshipsList`)
  - sidebar/meta query path (`postScholarshipsMeta`, `meta_only=1`)

---

## SSR/cache paths checked

### `scholarshipListServer.ts`
- No direct `unstable_cache(...)` + `cookies()/headers()` issue found in this file.

### `meta_only` / sidebar meta counts
- `ScholarshipsHubPageClient.tsx` issues frequent `postScholarshipsMeta(...)` requests for sidebar/global counts.
- These hit `/api/scholarships` with `meta_only=1`, which often qualifies as personalization context and triggers the problematic profile loader for signed-in users.

### SSR initial payload
- Hub SSR (`HubRootStreamedBridge` in `scholarshipsSlugPathPageBody.tsx`) fetches initial payload server-side and reads auth/profile directly.
- This SSR path itself is not the direct source of the `unstable_cache + cookies` warning; warning comes from API route path.

### metadata/meta-only paths
- `meta_only` path is actively used and contributes to repeated invocation frequency for authenticated hub sessions.

---

## Impact analysis

## 1) Runtime warning vs production impact
- **Not only warning.**
- Because fallback catches the error, user-visible 500 is usually avoided.
- But the intended profile cache path is bypassed; repeated warnings + direct DB reads indicate real runtime inefficiency.

## 2) Cache correctness
- This specific cache wrapper is effectively compromised for its intended optimization.
- Functional correctness is preserved by fallback, but cache benefit is largely lost.

## 3) Supabase egress
- Likely **increased** for authenticated traffic:
  - repeated profile reads on list + meta requests;
  - failed cached attempt + fallback path overhead.

## 4) SSR performance
- Degradation primarily on API list/meta pipeline (hub interactivity and repeated query cycles), not just static SSR render.

## 5) Guests vs authenticated
- **Guests:** mostly low impact (no session -> profile loader usually skipped).
- **Authenticated:** higher impact (personalization contexts frequently call profile loader).

---

## Regression check (`"avoid unstable_cache with cookies"` fixes)

- Git trace of `loadProfileForScholarshipsList` (`git log -L ...`) shows it was introduced in commit `b640785`.
- The problematic pattern (`unstable_cache` closure calling `createClient()` -> `cookies()`) has persisted from introduction.

### Audit verdict on regression

- This looks like an **old path that remained reachable**, not a brand-new code path.
- Recent hub/meta query behavior may have changed **frequency/visibility** (more calls), but the root server pattern is not newly introduced by current changes.

---

## Root cause

- Dynamic request-bound auth client creation (`createClient()` with `cookies()`) is executed **inside** an `unstable_cache` function body.
- `unstable_cache` requires deterministic/cache-safe inputs and disallows direct dynamic request sources in cached scope.

---

## Recommended architecture fix

1. **Split auth resolution from cached data fetch.**
   - Resolve `sessionUser`/auth context once in request scope.
   - Keep cached profile reader free from `cookies()/headers()` calls in its closure.

2. **Make cached layer deterministic by key only (e.g., userId) and non-dynamic client strategy.**
   - Avoid constructing cookie-bound Supabase client inside cached function.

3. **Keep direct fallback but treat as exception path, not normal path.**
   - If fallback rate is non-trivial, consider cache path unhealthy.

---

## Safe fixes vs risky fixes

### Safe fixes

- Remove `createClient()` call from inside `unstable_cache` closure.
- Keep request-scoped direct read for authenticated profile where needed.
- Add explicit telemetry counter for “cache path failed -> fallback” to validate improvement after refactor.

### Risky fixes

- Caching user profile with overly broad/shared keying (risk of cross-user leakage).
- Switching profile reads to service-role without strict access constraints.
- Removing fallback before confirming cache-path safety (could reintroduce user-facing 500s).

---

## Overall severity and priority

- **Severity:** High
- **Priority:** P1 for scholarship hub authenticated runtime path
- **Why:** repeated warning path + lost cache optimization + likely extra egress and degraded response behavior under active hub usage.
