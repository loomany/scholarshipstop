# Private / account localization — audit and safe fixes (2026-05-20)

## Score: **38 / 100** (honest — profile form still mostly English)

## Route audit

| Route | Auth | ES/FR route | UI localized | Safe now? | Action |
| --- | :---: | :---: | :---: | :---: | --- |
| `/account` | yes | `/es/account`, `/fr/account` **new** | partial | yes | Back link + signin redirect localized |
| `/account/saved-scholarships` | yes | redirect only | n/a | skip | Redirects to hub saved tab (EN path) |
| `/dashboard` | varies | no | no | skip | Legacy |
| `/saved-scholarships` | — | no | no | skip | Legacy redirect |
| `/onboarding` | yes | no | partial | risk | Stage 3M — auth/DB mutations |
| `/essay` | yes | no | no | skip | Product surface |
| `/subscription/success` | yes | no | no | skip | Lemon return |

## Sprint fixes (safe)

| Change | File |
| --- | --- |
| `getAccountUiCopy()` | `lib/i18n/accountUiCopy.ts` |
| Localized “Back to scholarships” | `components/account/AccountDashboardClient.tsx` (reads locale from pathname) |
| `/es/account`, `/fr/account` pages | `app/[locale]/account/page.tsx` — localized signin redirect |

## Not changed (intentional)

- `ScholarshipProfileForm.tsx` (~2000 lines) — field labels, validation, Supabase upsert
- `GrantNotificationToggles.tsx`
- Billing management URLs (Lemon portal English)
- Auth callbacks, session cookies, RLS

## Recommendation

**Do not block public SEO push** on full account form translation. Stage **3M**: extract `accountProfileUiCopy.ts` in slices (labels only, no mutation logic).

## SEO

All private routes: **noindex,follow** (existing). Not in ES/FR sitemaps.
