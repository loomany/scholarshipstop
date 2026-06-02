# Stage 5B — account/provider chrome post-deploy (2026-05-22)

## Deploy

| Field | Value |
|-------|-------|
| Commit | `31ccc29` — `fix(i18n): localize ES FR account and provider chrome` |
| Base | `5c2b659` (5C-4 IQ) |
| Push | `release/i18n-provider-account-chrome:main` |

## Changes

- `lib/i18n/providerDetailUiCopy.ts` — ES/FR provider detail chrome dictionary
- `app/providers/[id]/page.tsx` — wired via `getProviderDetailUiCopy('en')` + localized source/completeness badges
- Account/signin/onboarding — already used `accountUiCopy`, `accountProfileUiCopy`, `authUiCopy` (no auth/payment changes)

## Production smoke

`SMOKE_BASE_URL=https://scholarshiptop.com` (use apex; `www` 301s to apex)

| Check | Result |
|-------|--------|
| `/providers/loyola-university-chicago` | 200 |
| `/es/providers`, `/fr/providers` | 200 |
| `/es/account` → `/es/signin` | 307 |
| `/fr/account` → `/fr/signin` | 307 |
| `/es/signin`, `/fr/signin` | 200 (localized copy in HTML) |
| `/en` | 404 |

**Verdict: PASS**

## Not in this deploy

- `/es/providers/[slug]` / `/fr/providers/[slug]` (404 until `provider_profile` translations + routes)
- Provider DB body translation
- `428feaa` DB pilot scripts (still on `i18n-overnight-wip`)
