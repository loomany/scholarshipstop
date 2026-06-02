# Stage 5C — IQ Subdomain ES/FR Implementation Plan

**Date:** 2026-05-21  
**Prerequisite audit:** `i18n-stage5c-iq-localization-audit-2026-05-21.md`  
**Copy inventory:** `i18n-stage5c-iq-copy-inventory-2026-05-21.csv`  
**Constraints:** No `/en`, no new languages, no OpenAI, no Supabase schema changes, no auth/payment/Lemon behavior changes in v1.

---

## Recommendation: split into 4 implementation stages

One mega-PR is high-risk (middleware + 30 questions + landing + paywall + SEO). Suggested sequence:

| Stage | Focus | Ship criteria |
|-------|--------|---------------|
| **5C-1** | Middleware + locale infra + switcher + href helper | `/es` serves IQ not main home; EN `/` unchanged; switcher works |
| **5C-2** | Question bank + `AssessmentEngine` + scoring labels | All items/options ES/FR; domain chips localized |
| **5C-3** | General funnel: landing, email errors, paywall, `UnlockedIqReport`, metadata | End-to-end ES/FR general funnel |
| **5C-4** | SEO sitemap/hreflang, smoke script, legal + slug + contextual (optional) | Production smoke green; sitemap lists `/es` `/fr` |

---

## Stage 5C-1 — Routing and locale infrastructure

### 1.1 Middleware (`middleware.ts`)

Add **IQ host block before** `isStage2PilotLocale` (after existing IQ rewrites or integrated into same block):

```
For host === iq.scholarshiptop.com:
  - If pathname starts with /en or /en/ → redirect 308 to / or stripped path
  - If first segment is es|fr:
      - Strip prefix for rewrite target
      - Rewrite to /iq{remainder} (e.g. /es → /iq, /es/assessment → /iq/assessment)
      - Set request header x-iq-locale (or x-scholarshiptop-locale) to es|fr
  - Else set x-iq-locale to en
  - Continue existing /, /assessment, IQ_SUBDOMAIN_REWRITE_PATHS rules using stripped path
```

**Also:** When locale prefix present, rewrite marketing paths:

- `/es/scholarship-match` → `/iq/scholarship-match` + header `es`

**Redirect hygiene:**

- `iq.scholarshiptop.com/iq` → `/` (existing)
- `iq.scholarshiptop.com/es/iq` → `/es` (if ever hit)

### 1.2 Locale constants

**New files:**

| File | Purpose |
|------|---------|
| `lib/iq/i18n/iqLocales.ts` | `export const IQ_LOCALES = ['en','es','fr'] as const`, type `IqLocale`, `isIqLocale()`, default `en` |
| `lib/iq/i18n/resolveIqLocale.ts` | Read `headers().get('x-iq-locale')` / pathname on client |
| `lib/iq/i18n/iqLocalizedHref.ts` | `iqLocalizedHref(locale, '/about')` → `/es/about` on subdomain, `/iq` paths on www |

### 1.3 IQ layout wrapper

**New:** `app/iq/layout.tsx` (server)

- Read locale from header; pass to children via `IqLocaleProvider` context (client).
- Optionally set `<html lang>` override — today lang comes from root layout; ensure root layout reads IQ header when path is `/iq` **or** set `lang` in a nested wrapper (document in PR: may need root layout tweak to prefer `x-iq-locale` when `pathname` starts with `/iq`).

**Minimal change option:** In `app/layout.tsx`, if host is IQ subdomain, resolve locale from `x-iq-locale` instead of pathname segment.

### 1.4 Language switcher

**New:** `components/iq/IqLanguageSwitcher.tsx`

- Props: `currentPath` (pathname without locale prefix), `locale`
- Links: `/`, `/es`, `/fr` + preserve suffix (`/assessment`, `/about`, …)
- `aria-current` on active language
- Mount in `Navlinks.tsx` IQ minimal nav row (right side)

### 1.5 localStorage policy

- Bump keys to `iq_general_assessment:v2` with `{ locale, ...draft }` **or** suffix `:es`
- On locale change detected in `useEffect`, clear incompatible drafts (document in UI copy)

**Tests:** Manual + script (5C-4).

---

## Stage 5C-2 — Question bank and assessment UI

### 2.1 Localized question banks

**New:**

| File | Purpose |
|------|---------|
| `lib/iq/i18n/cognitiveAssessmentQuestions.en.ts` | Move existing array (or re-export from current file) |
| `lib/iq/i18n/cognitiveAssessmentQuestions.es.ts` | Full ES translations |
| `lib/iq/i18n/cognitiveAssessmentQuestions.fr.ts` | Full FR translations |
| `lib/iq/i18n/getCognitiveQuestions.ts` | `getCognitiveQuestions(locale)` |

**Keep:** `lib/cognitiveAssessmentQuestions.ts` as types + `export { cognitiveAssessmentQuestions }` from EN for backward compat during migration.

### 2.2 Domain labels and archetypes

**New:** `lib/iq/i18n/iqAssessmentLabels.ts` — `domainLabels(locale)`, `lockedArchetype(scores, locale)`

**Update:** `components/iq/assessmentScoring.ts` — delegate to locale-aware helpers or accept locale param in `buildAssessmentResult`.

**Update:** `AssessmentEngine.tsx` — accept `locale` prop; pass to question getter and labels.

### 2.3 AssessmentEngine strings

**New:** `lib/iq/i18n/iqAssessmentUiCopy.ts` — intro cards, progress, timer, analyzer messages, button labels.

**Wire:** `AssessmentEngine`, `AssessmentIntro`, `QuestionScreen`, `AnalyzerScreen`.

---

## Stage 5C-3 — General funnel, paywall, report

### 3.1 Landing

**Update:** `app/iq/ScholarshipIqTestClient.tsx` — consume `useIqLocale()` + `iqLandingCopy[locale]` dictionary (extract strings to `lib/iq/i18n/iqLandingCopy.ts`).

### 3.2 General funnel

**Update:** `app/iq/GeneralIqFunnelClient.tsx` — pass locale to `AssessmentEngine`, `StandardIqPaywall`; localize email validation string (or pass error messages from dictionary).

**Update:** `components/onboarding/CountryEmailSignupStep.tsx` — **only if** shared component shows hard-coded English on IQ; prefer IQ-specific wrapper props `copyOverrides` to avoid main onboarding regression.

### 3.3 Paywall and report

| File | Change |
|------|--------|
| `components/iq/StandardIqPaywall.tsx` | `iqPaywallCopy[locale]` |
| `components/iq/UnlockedIqReport.tsx` | Template copy by locale; display `result.archetype` as stored (ensure scoring used same locale) |
| `app/iq/report/[token]/page.tsx` | Localized metadata + not-found UI |
| `app/iq/page.tsx` | `generateMetadata` per locale (or dynamic from headers) |

### 3.4 Checkout action (UI strings only)

**Update:** `app/actions/iqReportCheckout.ts` — map error codes to localized messages on client; server can stay English short-term **or** accept `locale` param for error strings only (no Lemon change).

### 3.5 Footer

**Update:** `components/iq/IqProductFooter.tsx` — `iqLocalizedHref` for all links; localized labels.

---

## Stage 5C-4 — SEO, smoke, phase-2 surfaces

### 4.1 Metadata and sitemap

| File | Change |
|------|--------|
| `lib/seo/sitemaps.ts` | Add `/es`, `/fr` prefixed IQ URLs (and slug variants when ready) |
| `app/iq/page.tsx` | `alternates.languages` hreflang |
| `app/iq/[slug]/page.tsx` | Phase 2: per-slug ES/FR metadata |

### 4.2 Legal and contextual (phase 2)

| File | Notes |
|------|-------|
| `app/iq/about/page.tsx` (+ help, faq, privacy, terms, refund) | Large prose — `iqLegalCopy[locale][page]` |
| `app/iq/[slug]/page.tsx` | Five marketing landings |
| `app/iq/assessment/ContextualAssessmentFunnelClient.tsx` | Full funnel + `PostAssessmentQuiz` |
| `lib/strategyRecommendationEngine.ts` | Template ES/FR + localized profile labels or pass locale into label helpers |

### 4.3 Smoke script

**New:** `scripts/seo/i18n-stage5c-iq-localization-smoke.ts`

Checks (production or `BASE_URL`):

- `iq.scholarshiptop.com/` — English IQ hero marker
- `/es` — Spanish marker, **not** main-site “en español: busca, compara” hub
- `/fr` — French marker
- `/es` — no `/en` link in switcher HTML
- Optional: one question page snapshot if test mode with `?e2e=1` (future)

---

## File checklist (v1 core)

| Action | Path |
|--------|------|
| Create | `lib/iq/i18n/iqLocales.ts` |
| Create | `lib/iq/i18n/resolveIqLocale.ts` |
| Create | `lib/iq/i18n/iqLocalizedHref.ts` |
| Create | `lib/iq/i18n/iqAssessmentUiCopy.ts` |
| Create | `lib/iq/i18n/iqLandingCopy.ts` |
| Create | `lib/iq/i18n/iqPaywallCopy.ts` |
| Create | `lib/iq/i18n/iqReportCopy.ts` |
| Create | `lib/iq/i18n/cognitiveAssessmentQuestions.{en,es,fr}.ts` |
| Create | `lib/iq/i18n/getCognitiveQuestions.ts` |
| Create | `lib/iq/i18n/iqAssessmentLabels.ts` |
| Create | `components/iq/IqLanguageSwitcher.tsx` |
| Create | `components/iq/IqLocaleProvider.tsx` |
| Create | `app/iq/layout.tsx` |
| Create | `scripts/seo/i18n-stage5c-iq-localization-smoke.ts` |
| Modify | `middleware.ts` |
| Modify | `app/layout.tsx` (IQ host locale resolution) |
| Modify | `components/ui/Navbar/Navlinks.tsx` |
| Modify | `components/iq/AssessmentEngine.tsx` |
| Modify | `components/iq/assessmentScoring.ts` |
| Modify | `app/iq/GeneralIqFunnelClient.tsx` |
| Modify | `app/iq/ScholarshipIqTestClient.tsx` |
| Modify | `components/iq/StandardIqPaywall.tsx` |
| Modify | `components/iq/UnlockedIqReport.tsx` |
| Modify | `components/iq/IqProductFooter.tsx` |
| Modify | `app/iq/page.tsx` |
| Modify | `app/iq/report/[token]/page.tsx` |
| Modify | `lib/seo/sitemaps.ts` |
| Optional | `lib/cognitiveAssessmentQuestions.ts` (thin re-export) |

**Estimated total:** ~18–22 files touched for v1 core; +10–15 for phase 2.

---

## QA plan

### Automated

- [ ] `npm run build` (or project build command)
- [ ] `npx tsc --noEmit` if separate from build
- [ ] `npx tsx scripts/seo/i18n-stage5c-iq-localization-smoke.ts` against staging/production

### English regression (`/`)

- [ ] Landing copy unchanged semantically
- [ ] Start assessment → 30 questions English
- [ ] Paywall shows English; localhost preview unlock still works
- [ ] Checkout insert still creates `iq_report_orders` (staging)
- [ ] No new `/en` routes

### Spanish (`/es`)

- [ ] Landing fully Spanish
- [ ] All 30 prompts + 4 options each Spanish
- [ ] Domain chips + difficulty/timer UI Spanish
- [ ] Analyzer + result/paywall template Spanish
- [ ] Archetype string Spanish in locked preview
- [ ] Switcher: Español active; English → `/`, Français → `/fr`

### French (`/fr`)

- [ ] Same checklist as Spanish

### Switcher / routing

- [ ] Pathname drives active locale (not stale localStorage)
- [ ] `/en` redirects to `/`
- [ ] `iq.scholarshiptop.com/es` does **not** render main ScholarshipTop hub

### Progress preservation

- [ ] Mid-assessment switch `/` → `/es`: defined behavior (clear draft or re-label) — no crash
- [ ] Completed result in one locale: paywall copy matches locale

### Mobile / chrome

- [ ] Assessment fixed header + switcher no overlap on 320px
- [ ] IQ minimal navbar usable

### SEO

- [ ] Report token URL still `noindex`
- [ ] hreflang links valid on home (when implemented)
- [ ] Sitemap includes `/es` `/fr` only after ready

### Out of scope verification

- [ ] Lemon checkout page language unchanged
- [ ] Google OAuth screen unchanged
- [ ] No Supabase migrations

---

## Final answers (handoff)

| Item | Decision |
|------|----------|
| **Safe to localize now?** | **Yes** — after middleware fix for `/es` `/fr`. |
| **Route strategy** | **Option A:** `iq.scholarshiptop.com/es`, `/fr`, English `/`, **no `/en`**. |
| **Files touched** | **~18–22** (v1 core), **~28–35** (with legal + slug + contextual). |
| **One stage or split?** | **Split:** 5C-1 routing → 5C-2 questions → 5C-3 funnel/report → 5C-4 SEO + phase 2. |
| **Biggest risks** | Wrong-host `/es` until middleware ships; English JSON in stored results; scope creep on contextual funnel + legal volume. |

---

## Approval gate

Do **not** implement until this plan is reviewed. After approval, implement **5C-1** first and run production smoke proving `/es` serves IQ product before translating question bank.
