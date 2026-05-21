# i18n subscription localization (2026-05-19)

**Status: READY** — ES/FR subscription UI localized; payment/Lemon logic unchanged.

No commit. No push.

## 1. Summary

| Check | Result |
| --- | --- |
| `/subscription` | English UI unchanged (same layout, prices, plan keys) |
| `/es/subscription` | Spanish copy, HTTP 200 |
| `/fr/subscription` | French copy, HTTP 200 |
| Nav Pricing | **Precios** → `/es/subscription`, **Tarifs** → `/fr/subscription`, **Pricing** → `/subscription` |
| Language switcher | 51/51 pass (incl. subscription cluster) |
| `i18n-locale-link-audit` | 0 blocking (118 pages, 18/18 clicks) |
| `i18n-visible-text-audit` | 0 blocking English UI (118 pages, incl. `/es/subscription`, `/fr/subscription`) |
| `npx tsc --noEmit` | PASS |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | 51/51 pass |
| `npm run build` | Compiled successfully |

## 2. English `/subscription` SEO policy (preserved)

Before localization, English `/subscription` had:

- `metadata.title`: `Unlock Premium Precision`
- **No explicit `robots`** → Next.js default (**indexable**)
- **Not** in `lib/seo/sitemaps.ts` (same as before)

ES/FR pages follow the same policy:

- Self-canonical: `/es/subscription`, `/fr/subscription`
- `hreflang` cluster: `en`, `es`, `fr`, `x-default` via `buildLocalizedAlternates` in `lib/i18n/subscriptionMetadata.ts`
- No `noindex` added (matches English indexability)
- Not added to sitemap (unchanged scope)

## 3. Architecture (safe split)

**Shared server loader** — `lib/server/subscriptionPageProps.ts`

- Same Supabase auth, profile, subscription row reads as before
- Same `deriveSubscriptionPresentation`, Lemon portal URLs, `past_due` / skip-trial / resume logic
- Only addition: `returnPath` per locale for guest onboarding redirect (`/subscription` vs `/es/subscription` vs `/fr/subscription`)
- Billing fix fallback URL uses locale-prefixed path

**Shared view** — `components/subscription/SubscriptionPageView.tsx`

- Renders `h1`, `SubscriptionPricingClient`, payment disclaimer from `copy` prop

**Client pricing UI** — `components/subscription/SubscriptionPricingClient.tsx`

- Accepts `copy: SubscriptionPricingUiCopy` + `returnPath`
- **Unchanged:** `getCheckoutURL(planKey)`, `/api/billing/cancel-subscription`, `/api/billing/resume-subscription`, `/api/billing/update-subscription`, Lemon `Url.Open`, checkout success redirect to `/scholarships?status=success`
- **Unchanged plan keys:** `monthly`, `quarterly`, `yearly`
- **Unchanged prices:** `$14.99`, `$9.66`, `$7.40`, billing lines

**Copy contract** — `lib/i18n/subscriptionPageCopy.ts`

- EN / ES / FR strings for page title, plan cards, badges, features, CTAs, errors, disclaimers
- `translateSubscriptionPlanStatusLabel()` maps English billing status labels to ES/FR for disabled “current plan” button only

**Routes**

- `app/subscription/page.tsx` — English (thin wrapper)
- `app/[locale]/subscription/page.tsx` — ES/FR (`force-dynamic`, same loader)

## 4. Navigation (Task C)

`components/ui/Navbar/Navlinks.tsx`:

- Pricing link shown for **all** locales (removed `locale === 'en'` gate)
- `subscriptionHref = localizedSubscriptionHref(locale)` → `/subscription`, `/es/subscription`, `/fr/subscription`
- Mobile drawer: Precios/Tarifs link for ES/FR; “For organizations” remains EN-only

## 5. Language switcher (Task E)

`lib/i18n/localizedHref.ts`:

- `localizedSubscriptionHref`, `isLocalizedSubscriptionPath`
- `getStage2LanguageSwitcherItems` includes `/subscription` cluster
- `isExplicitEnglishOnlyInternalLink` no longer treats `/subscription` as English-only
- `LOCALIZED_FUNNEL_PATHS` includes `/subscription` for locale-link rewrite rules

Verified:

- `/subscription` → EN active; ES → `/es/subscription`; FR → `/fr/subscription`
- `/es/subscription` → EN → `/subscription`; ES active; FR → `/fr/subscription`
- `/fr/subscription` → symmetric
- No `/en` links

## 6. Payment / checkout safety (Task F)

**Not modified:**

- `app/actions/billing.ts` (`getCheckoutURL`, plan IDs, Lemon variant IDs)
- `app/api/billing/**`
- `lib/payments/**`
- `app/subscription/success/page.tsx`
- Lemon.js checkout trigger (`window.LemonSqueezy.Url.Open`)
- Auth session / Supabase queries (same calls, same tables)

**Verified unchanged:**

- Plan buttons still call `onSelect(planKey)` → `getCheckoutURL(planKey)` or update-subscription API
- Guest still redirects via `onboardingStepHref(1, returnPath)` with locale-aware `returnPath`
- `BillingPlanKey`: `monthly` | `quarterly` | `yearly` only

## 7. Copy translated (Task B)

All user-listed strings are in `lib/i18n/subscriptionPageCopy.ts` for ES and FR, including:

- Page title, plan names (Monthly/Quarterly/Yearly → Mensual/Trimestral/Anual, etc.)
- Badges (Most Popular, Best Value)
- Billing lines (amounts unchanged)
- Feature bullets (premium scholarships, IQ report, Easy Apply, essay mentor, savings %)
- Footer: LemonSqueezy Merchant of Record disclaimer
- UI chrome: Start Plan, Cancel, Update Billing Info, Resume, Redirecting, error messages

**Kept in English (brand/product):** ScholarshipTop, LemonSqueezy, IQ Essay Mentor (where product name), Easy Apply, International.

## 8. Audit results

### Language switcher (`i18n-language-switcher-audit-2026-05-19.{md,json}`)

```json
{
  "totalPages": 51,
  "pagesPassingSwitcher": 51,
  "pagesWithBlockingSwitcherIssues": 0
}
```

Subscription cluster: all three URLs pass.

### Locale-link (`i18n-locale-link-audit-2026-05-19.{md,json}`)

```json
{
  "blockingLinkIssues": 0,
  "clickTestsPassed": 18
}
```

ES/FR `/subscription` links are blocking if they point to English `/subscription` without locale prefix (audit enforces localized href).

### Visible-text (`i18n-visible-text-audit-2026-05-19.{md,json}`)

```text
Pages audited: 118
Pages with blocking English UI: 0
Pages with blocking link issues: 0
```

Added `/es/subscription` and `/fr/subscription` to `FUNNEL_AUDIT_PATHS` in `scripts/i18n-visible-text-audit.ts`.

## 9. Smoke checks

**200:** `/subscription`, `/es/subscription`, `/fr/subscription`

**404:** `/en/subscription`, `/de/subscription`, `/pt/subscription`, `/ar/subscription` (and other unsupported locales per middleware)

## 10. Files changed

| File | Change |
| --- | --- |
| `lib/i18n/subscriptionPageCopy.ts` | **NEW** — EN/ES/FR copy contract |
| `lib/i18n/subscriptionMetadata.ts` | **NEW** — metadata + hreflang |
| `lib/server/subscriptionPageProps.ts` | **NEW** — shared server loader |
| `components/subscription/SubscriptionPageView.tsx` | **NEW** — shared page shell |
| `components/subscription/SubscriptionPricingClient.tsx` | Copy props; no payment logic changes |
| `app/subscription/page.tsx` | Thin wrapper → shared loader/view |
| `app/[locale]/subscription/page.tsx` | **NEW** — ES/FR routes |
| `lib/i18n/localizedHref.ts` | Subscription switcher + href helpers |
| `components/ui/Navbar/Navlinks.tsx` | Precios/Tarifs visible; localized hrefs |
| `lib/i18n/__tests__/languageSwitcher.test.ts` | +1 subscription cluster test |
| `scripts/i18n-language-switcher-audit.ts` | Subscription cluster (3 pages) |
| `scripts/i18n-locale-link-audit.ts` | Allow localized subscription links |
| `scripts/i18n-visible-text-audit.ts` | Audit `/es/subscription`, `/fr/subscription` |

## 11. What was NOT touched

- No OpenAI / translation APIs
- No Supabase writes / migrations
- No Lemon checkout URLs, variant IDs, webhooks
- No `app/api/billing/**` changes
- No auth/session logic changes
- No new languages; no `/en` route
- No commit / push

## 12. User-facing result

On `http://localhost:3000/subscription`, switching language to Español or Français now:

1. Shows **Precios** / **Tarifs** in the navbar (no longer hidden)
2. Navigates to `/es/subscription` or `/fr/subscription`
3. Displays fully translated pricing UI with the same three plan cards and checkout behavior as English
