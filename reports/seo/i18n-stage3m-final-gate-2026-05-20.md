# Stage 3M Final Gate (2026-05-20)

**No commit. No push.** QA server: **`http://localhost:3020`** (`npm run build` → `npx next start -p 3020`).

---

## Executive verdict

| Question | Answer |
| --- | --- |
| **Full Playwright trio completed?** | **Yes** — after blocker fixes (2026-05-21 run on `:3020`) |
| **Ready for ES/FR UI push?** | **Yes** — automated gates clean; manual spot-check recommended for account + Lemon return URL |
| **Hreflang smoke failures?** | **Fixed** (real bug, not false positive) |
| **Onboarding audit failures?** | **Fixed** (locale URL sync bug) |

---

## 1. Playwright audit trio (full mode)

`LINK_AUDIT_CLICKS_ONLY` unset (full crawl + click tests).

| Audit | Result | Report |
| --- | --- | --- |
| **Visible text** | **PASS** — 124 pages, **0** blocking EN UI, **0** blocking attrs, **0** link issues, **0** errors | `reports/seo/i18n-visible-text-audit-2026-05-19.md` |
| **Locale links** | **PASS** — 118 pages crawled, **0** blocking, 452 allowed Zone C, 18/18 click tests | `reports/seo/i18n-locale-link-audit-2026-05-19.json` |
| **Language switcher** | **PASS** — **51/51** pages | `reports/seo/i18n-language-switcher-audit-2026-05-19.json` (generatedAt in run output) |

**Funnel paths explicitly audited** (added to visible-text script):  
`/es|fr/onboarding`, `/es|fr/subscription/success`, `/es|fr/account`, plus existing get-scholarships / signin / subscription.

---

## 2. Hreflang investigation

### Reproduction (before fix)

`i18n-build-smoke-check.ts` failed on `/es/scholarships` and `/fr/scholarships` with **“missing hreflang cluster”**.

**Root cause (confirmed, not false positive):**  
`app/[locale]/scholarships/[[...slugPath]]/page.tsx` set only `alternates: { canonical }` for the scholarships **root** (`segments.length === 0`). English root correctly used `buildStage2EnglishPilotAlternates('/scholarships')`.

### Fix (minimal metadata)

```typescript
alternates: buildLocalizedAlternates({
  canonicalPath: '/scholarships',
  currentLocale: locale,
  availableLocales: ['en', 'es', 'fr'],
  defaultUrl: getLocalizedCanonical('/scholarships', 'en')
});
```

### Evidence after fix (`http://localhost:3020`)

| Path | canonical | hreflang en/es/fr/x-default |
| --- | --- | --- |
| `/scholarships` | `…/scholarships` | **Yes** |
| `/es/scholarships` | `…/es/scholarships` | **Yes** |
| `/fr/scholarships` | `…/fr/scholarships` | **Yes** |

`i18n-build-smoke-check.ts`: **21/21 OK** (including `/es/scholarships`, `/fr/scholarships`).

### Hub tab URLs (documented gap, not smoke-blocking)

| Path | hreflang in initial HTML |
| --- | --- |
| `/scholarships/hub/best-recommendation` | **No** (canonical only) |
| `/es/scholarships/hub/best-recommendation` | **No** |
| `/fr/scholarships/hub/best-recommendation` | **No** |

Same on **EN and ES/FR** — pre-existing; `buildScholarshipHubRouteMetadata` emits canonical only. Hub listing UI is client-heavy; smoke script does **not** check hub paths. **Not a Stage 3M regression.** Optional follow-up: add `buildLocalizedAlternates` to hub metadata in a later SEO pass.

Query/filter hub URLs: `robots: noindex,follow` when non-canonical query present (unchanged).

---

## 3. Blocker fixes applied this gate

| Issue | Fix |
| --- | --- |
| Missing hreflang on `/es|fr/scholarships` | `buildLocalizedAlternates` on localized scholarships root metadata |
| Onboarding EN placeholder on `/es|fr/onboarding` | `localizedOnboardingStepHref()` — `router.replace` no longer sends users to `/onboarding?step=` (EN) from `/es/onboarding` |
| Onboarding page SSR | `app/[locale]/onboarding/page.tsx` → **server** component passing `uiLocale` |
| ES/FR sign-in “Create account” → EN onboarding | `localizedScholarshipOnboardingSignupEntryHref()` in PasswordSignIn / EmailSignIn / ForgotPassword |
| Audit coverage | Funnel paths in `i18n-visible-text-audit.ts` |

**Helper:** `scripts/i18n-onboarding-placeholder-spotcheck.ts` — ES/FR placeholder spot-check (PASS).

---

## 4. Onboarding / signup locale behavior

| Route | Status | Notes |
| --- | --- | --- |
| `/es/onboarding`, `/fr/onboarding` | **200** | Step URLs stay under `/es|fr/onboarding?step=` |
| `/onboarding` | **200** | EN canonical |
| `/signup` | **302 → `/onboarding`** | EN-only marketing redirect (unchanged) |
| `/es/signin/*` “Create account” | **→ `/es/onboarding?step=1`** | Safe UI href only |
| `/fr/signin/*` | **→ `/fr/onboarding?step=1`** | Same |

No auth/session/Supabase changes.

---

## 5. Subscription success / reset password

| Route | Status |
| --- | --- |
| `/es/subscription/success`, `/fr/subscription/success` | **200**, localized copy |
| `/auth/reset_password` | **200**; UI strings via `authUiCopy` + `readStoredUiLocale()` |

**Reset password limitation (documented):** Supabase email still opens `/auth/reset_password` (EN URL). After user visited `/es` or `/fr`, `sessionStorage` drives redirects to `/es|fr/signin/forgot_password` and `/es|fr/signin/update_password`. Not configurable without Supabase dashboard URL change.

**Lemon:** Hosted checkout remains English; no billing API / plan ID / checkout URL changes.

---

## 6. Account / profile

Audited in visible-text run: `/es/account`, `/fr/account`.

| UI | ES/FR |
| --- | --- |
| Log out | Localized |
| Resend confirmation | Localized |
| Email confirmed / not confirmed | Localized |
| School level / citizenship selects | Display labels localized (values EN slugs) |
| Field of study | Partial EN fallback for unmapped slugs |

No Supabase mutation / auth logic changes in account paths.

---

## 7. Base checks

| Check | Result |
| --- | --- |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **54/54 PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `i18n-build-smoke-check.ts` | **PASS** (all hreflang checks) |

### Git hygiene

| Item | Status |
| --- | --- |
| `app/api/billing/**`, `lib/payments/**`, `app/actions/billing.ts` | **No diff** |
| `.env` / secrets in status | **None** in staged intent |
| Supabase migrations | **None** |
| `/en` route | **None** |
| New locales | **None** |

`SubscriptionPricingClient.tsx` — **UI copy only** (Lemon open flow unchanged).

---

## 8. Remaining English / out of scope

| Surface | Why |
| --- | --- |
| Lemon checkout overlay | External hosted UI |
| `/signup` → `/onboarding` | EN canonical redirect |
| `/auth/reset_password` URL | Supabase template |
| `/essay` product | High risk — not in this release |
| Hub tab hreflang | EN+ES+FR all canonical-only today |
| DB scholarship titles on hubs | Stage 4 DB translation |
| Onboarding OAuth/validation toasts | Mostly EN server messages |
| Resources ES/FR DB grid | Intentionally hidden |

---

## 9. Updated scores

| Area | Score |
| --- | ---: |
| Public/static ES/FR | **99** |
| Funnel ES/FR | **99** |
| Private/account ES/FR | **88** |
| Static SEO ES/FR | **98** |
| DB SEO readiness | **18** |
| English SEO safety | **96** |
| **Overall push readiness** | **96** |

---

## 10. Manual checks before deploy (short list)

1. `/es/onboarding?step=1` — country placeholder ES; step 2 ES  
2. `/es/signin/password_signin` — “Create account” → `/es/onboarding`  
3. `/es/account` — log out / resend / selects  
4. `/es/subscription/success`  
5. Visit `/es` → open reset email link → confirm redirect to `/es/signin/...`  
6. Lemon checkout from `/es/subscription` — overlay still English (expected)

---

## 11. Files touched in final gate (metadata + funnel UX only)

- `app/[locale]/scholarships/[[...slugPath]]/page.tsx` — hreflang  
- `app/[locale]/onboarding/page.tsx` — server wrapper  
- `lib/onboarding/onboardingResume.ts` — localized step + signup hrefs  
- `components/onboarding/ScholarshipOnboardingWizard.tsx` — localized step navigation  
- `components/ui/AuthForms/{PasswordSignIn,EmailSignIn,ForgotPassword}.tsx` — signup href  
- `scripts/i18n-visible-text-audit.ts` — funnel path coverage  
- `scripts/i18n-onboarding-placeholder-spotcheck.ts` — new spot-check  

---

*Gate completed 2026-05-21. Server: port 3020. Do not commit/push per instructions.*
