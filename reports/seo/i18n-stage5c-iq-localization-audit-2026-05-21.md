# Stage 5C — IQ Subdomain ES/FR Localization Audit

**Date:** 2026-05-21  
**Scope:** Audit + plan only (no code deploy, no Supabase writes, no auth/payment/Lemon changes, no OpenAI, no `/en`, no new languages).  
**Production host:** `iq.scholarshiptop.com`  
**Companion artifacts:** `i18n-stage5c-iq-copy-inventory-2026-05-21.csv`, `i18n-stage5c-iq-implementation-plan-2026-05-21.md`

---

## Executive summary

| Question | Answer |
|----------|--------|
| **Safe to localize now?** | **Yes, with middleware-first routing fix.** Core IQ is deterministic, same-repo, no OpenAI in the cognitive path. **Blocker today:** `/es` and `/fr` on the IQ host serve the **main ScholarshipTop Spanish/French home**, not the IQ product. |
| **Recommended routing** | **Option A** — `iq.scholarshiptop.com/es`, `/fr`, English at `/`, **no `/en`**. Requires **IQ-specific middleware** before the global `isStage2PilotLocale` pass-through. |
| **AI in results?** | **No** for the 30-question cognitive test. Scoring is `assessmentScoring.ts`; report UI is template + stored JSON. Contextual scholarship funnels use **rule-based** `generateStrategy()` (English templates) — separate phase. |
| **Stage 5A score (~5%)** | Accurate: zero switcher, ~100% English across landing, items, paywall, report. |

---

## 1. Route and code map

### 1.1 App routes (`app/iq/*`)

| Public path (IQ subdomain) | Internal Next path | Component / role |
|----------------------------|-------------------|------------------|
| `/` | `/iq` (rewrite) | `page.tsx` → `GeneralIqFunnelClient` → `ScholarshipIqTestClient` landing |
| `/assessment` | `/iq/assessment` (rewrite) | `assessment/page.tsx` → contextual funnel |
| `/scholarship-match`, `/provider-research`, `/college-fit`, `/essay-prep`, `/deadline-strategy` | `/iq/{slug}` (rewrite) | `[slug]/page.tsx` — SEO intent landings |
| `/about`, `/help`, `/faq`, `/privacy-policy`, `/terms`, `/refund-policy` | `/iq/...` (rewrite) | Legal/static pages via `IqLegalPage` |
| `/report/{token}` | `/iq/report/{token}` | Server: Supabase `iq_report_orders`; `UnlockedIqReport` |
| `scholarshiptop.com/iq/*` | Direct | Same tree; middleware **308** redirects `/iq` prefix away on IQ host |

**General funnel phases** (`GeneralIqFunnelClient.tsx`): `landing` → `email` (`CountryEmailSignupStep`) → `assessment` (`AssessmentEngine`) → `paywall` (`StandardIqPaywall`).

**Contextual funnel** (`ContextualAssessmentFunnelClient.tsx`): intro → assessment → email → IQ ready → IQ paywall → qualification → account → strategy paywall (scholarship intent; uses profile constants + `generateStrategy`).

### 1.2 Middleware (`middleware.ts`)

IQ host handling (runs **before** main-site locale logic):

1. `/` → rewrite to `/iq`
2. `/iq` → redirect 308 to `/` (canonical subdomain root)
3. `/iq/*` → redirect 308 strip `/iq` prefix
4. `/assessment` → rewrite to `/iq/assessment`
5. Fixed marketing/legal paths → rewrite to `/iq{path}`

**Gap:** No handling for `/es`, `/fr`, or `/es/assessment`. Those fall through to `isStage2PilotLocale('es'|'fr')`, which sets `x-scholarshiptop-locale` and serves **`app/[locale]/...`** (main site), not `app/iq`.

**Production probe (2026-05-21):**

| URL | Status | Actual content |
|-----|--------|----------------|
| `https://iq.scholarshiptop.com/` | 200 | IQ home metadata (English) |
| `https://iq.scholarshiptop.com/es` | 200 | Main site ES home (“ScholarshipTop en español…”) — **wrong product** |
| `https://iq.scholarshiptop.com/fr` | 200 | Main site FR home — **wrong product** |
| `https://iq.scholarshiptop.com/assessment` | 200 | IQ assessment metadata (English) |

### 1.3 Layout and chrome

- **Root `app/layout.tsx`:** Always renders main `Navbar` + `SiteFooter` with `requestLocale` from `x-scholarshiptop-locale` (main i18n header).
- **IQ host:** Hides `HomeAiNavigatorWidget` only; does **not** hide main nav/footer.
- **`Navlinks.tsx`:** On IQ subdomain or `/iq/*` paths, renders **minimal IQ product nav** (`isIqProductPage`), logo href `/` on subdomain.
- **Product footer:** `IqProductFooter` on IQ flows; links use `/iq/...` (subdomain middleware rewrites to clean paths).

### 1.4 Question flow and data

| Layer | File | Notes |
|-------|------|-------|
| Question bank | `lib/cognitiveAssessmentQuestions.ts` | **30** items; English `prompt`, `options`, `explanation`, optional `visual.title/caption` |
| Engine UI | `components/iq/AssessmentEngine.tsx` | Intro, progress, timer, domain/difficulty chips, analyzer, localStorage draft |
| Scoring | `components/iq/assessmentScoring.ts` | Weighted IQ, percentiles, `domainLabels`, `lockedArchetype` (**English labels stored in result**) |
| Types | `lib/iqAssessmentTypes.ts` | `AssessmentResult` persisted to DB |
| Storage keys | `GeneralIqFunnelClient` | `iq_general_assessment:v1`, `iq_general_funnel_phase:v1`, `iq_general_email:v1`, `iq_general_result:v1` — **not locale-scoped** |

### 1.5 Paywall, checkout, report

| Surface | File | DB / external |
|---------|------|----------------|
| Paywall UI | `components/iq/StandardIqPaywall.tsx` | Lemon checkout via `getIqReportCheckoutURL` |
| Checkout action | `app/actions/iqReportCheckout.ts` | **Insert** `iq_report_orders` (pending); Lemon variant env; English HTML description |
| Unlocked report | `components/iq/UnlockedIqReport.tsx` | Reads `assessment_result` JSON (includes **English** `archetype`, `domainScores[].label`) |
| Token page | `app/iq/report/[token]/page.tsx` | **Select** paid/sent orders; `robots: { index: false }` |

**Out of scope (per constraints):** Lemon hosted checkout UI, webhook logic, auth provider screens, payment amounts/variant IDs.

### 1.6 APIs and AI

- **No OpenAI** in cognitive assessment or `UnlockedIqReport`.
- **Supabase:** OAuth on email step (shared client); `iq_report_orders` read/write on checkout and report page.
- **Telegram:** `notifyIqReportEmailCaptured` on email (metadata only).
- **Contextual path:** `generateStrategy()` — template strings, not LLM.

---

## 2. Locale routing recommendation

### Options evaluated

| Option | Verdict |
|--------|---------|
| **A) `/es`, `/fr` on IQ host** | **Recommended.** Matches main-site Stage 2 pattern, crawlable alternates, no query-string ambiguity. **Requires new middleware** (see implementation plan). |
| **B) `?lang=es`** | Rejected: weak SEO, easy to strip in shares, inconsistent with main site, stale URL state. |
| **C) cookie/localStorage only** | Rejected: no shareable localized URLs; conflicts with pathname-based switcher requirement; poor SEO clarity. |

### Target URL model

| Locale | IQ subdomain URL | Internal rewrite (example) |
|--------|------------------|----------------------------|
| English | `https://iq.scholarshiptop.com/` | `/iq` |
| Spanish | `https://iq.scholarshiptop.com/es` | `/iq` + `x-iq-locale: es` |
| French | `https://iq.scholarshiptop.com/fr` | `/iq` + `x-iq-locale: fr` |
| Spanish assessment | `https://iq.scholarshiptop.com/es/assessment` | `/iq/assessment` + locale header |

**Rules:**

- **No `/en`** anywhere on IQ host; redirect `/en` → `/` if requested.
- Do **not** mount IQ under `app/[locale]/iq` without subdomain guards — would double-bind main site routing.
- Prefer dedicated header `x-iq-locale` (`en` | `es` | `fr`) **or** reuse `x-scholarshiptop-locale` only on IQ rewrites so root layout `lang=` attribute matches — document single source in implementation.

---

## 3. Language switcher plan

**Component:** New `IqLanguageSwitcher` (client), placed in IQ minimal navbar and/or top of `AssessmentEngine` fixed header.

| Control | Behavior |
|---------|----------|
| English | `href="/"` on subdomain (`/iq` on www) |
| Español | `href="/es"` |
| Français | `href="/fr"` |
| Active locale | Derived from **pathname** first segment on IQ host (`es`/`fr`), else `en` — **not** from localStorage |
| `/en` | Never linked; 301/308 to `/` if hit |

**Progress preservation:**

- Same question IDs and answer keys across locales → switching language can reload **localized strings** without invalidating scoring logic.
- **Risk:** `assessment_result` and drafts store **English** `archetype` / `domainScores[].label`. On locale switch mid-funnel, either:
  - **(Recommended v1)** Clear assessment draft when pathname locale changes (one-time toast), or
  - Re-score labels on read from answers (no re-test) — slightly more work, better UX.
- Funnel phase keys: append locale suffix (`iq_general_assessment:v1:es`) **or** store `locale` inside draft JSON.

**Footer/legal links:** Use `iqLocalizedHref(locale, path)` so ES footer points to `/es/about`, not `/about` (which would show English until middleware extended).

---

## 4. Copy inventory summary

Full row-level export: **`i18n-stage5c-iq-copy-inventory-2026-05-21.csv`** (93 data rows).

| Category | Count (approx.) | v1 scope |
|----------|-----------------|----------|
| `static_ui` | Landing, engine chrome, footer, navbar, email errors | Yes (general funnel) |
| `question_bank` | 30 prompts + 120 options + explanations + visual captions | Yes |
| `result_template` | Domain labels, archetypes, paywall, `UnlockedIqReport` | Yes |
| `seo_meta` | `app/iq/page.tsx`, slug pages, report token page | Yes (home + assessment); slug pages phase 2 |
| `auth_paywall` | Paywall copy + server error strings only | UI/errors yes; Lemon product HTML optional phase 2 |
| `dynamic_generated` | `generateStrategy`, contextual funnel | Phase 2 |
| Out of scope | Lemon UI, OAuth provider, main `SiteFooter` scholarship links | No |

**Regenerate inventory:** `npx tsx scripts/seo/i18n-stage5c-iq-copy-inventory.ts`

---

## 5. Translation strategy (v1)

- **No OpenAI.** Static ES/FR dictionaries.
- **Structure:** `lib/iq/i18n/iqLocales.ts`, `iqUiCopy.ts`, `cognitiveAssessmentQuestions.es.ts` / `.fr.ts` (or map keyed by question `id`).
- **Question bank:** Translate all prompts, options, explanations, visual title/caption; keep `id`, `correct_option`, weights, timers unchanged.
- **Scoring:** Localize `domainLabels` and `lockedArchetype` **at score time** using active locale so JSON stored for checkout matches user language (or re-localize on render from domain keys — prefer score-time for paywall/email consistency).
- **Reports:** Template strings in `UnlockedIqReport`; numeric IQ/percentile unchanged.
- **Checkout:** Localize user-visible errors; leave Lemon variant/description unchanged in v1 unless product approves translated checkout description.

---

## 6. SEO / index policy

| Page type | Index? | Canonical / hreflang |
|-----------|--------|----------------------|
| IQ home `/`, `/es`, `/fr` | **Yes** (marketing) | Self-canonical per locale URL on `iq.scholarshiptop.com`; add `hreflang` `en`, `es`, `fr`, `x-default` → English `/` |
| Intent landings (5 slugs) | Yes (today in sitemap) | Per-locale canonical when localized; extend `IQ_SEO_SITEMAP_PATHS` with `/es`, `/fr` prefixes in phase 2 |
| Legal/help | Yes (low priority) | Same pattern |
| `/assessment` (interactive) | **Optional noindex** | Consider `noindex` for thin/tool UX; if indexed, localize titles |
| `/report/{token}` | **No** (already `robots.index: false`) | Keep private; no hreflang |
| `scholarshiptop.com/iq` | Prefer **301** to subdomain (existing host split) | Do not add `/en/iq` on main domain |

**Sitemap (`lib/seo/sitemaps.ts`):** Today lists English IQ paths only. After launch, add `/es` and `/fr` alternates (or separate URL entries) — do not emit `/en`.

**Robots:** No change required for token reports. Ensure localized IQ pages are not blocked.

---

## 7. Safe to localize now?

**Yes**, provided implementation starts with:

1. **Middleware** IQ locale strip + rewrite (fixes wrong main-site `/es` behavior).
2. **Locale provider** for `app/iq` tree (read header in server components, hook in client).
3. **English regression gate** — default locale unchanged at `/`.
4. **Phased scope** — general funnel + question bank + report/paywall first; contextual funnels + 5 slug landings + legal bulk second.

---

## 8. Biggest risks

1. **Routing collision** — Shipping `/es` without IQ middleware breaks worse than today (main site ES on IQ host). Must be first commit.
2. **Stored English in `assessment_result`** — Paywall/report after locale switch shows mixed language unless labels re-derived or locale stored on order.
3. **Main site chrome** — `Navbar`/`SiteFooter` still use main locale header; IQ `/es` must not set global header in a way that leaks wrong footer links on non-IQ paths if user navigates away.
4. **Translation volume** — 30 cognitive items + long landing page + legal pages; QA load is non-trivial.
5. **Contextual funnel scope creep** — 1700-line client + English profile option labels + `generateStrategy` templates.
6. **Sitemap/hreflang drift** — Forgetting `/es`/`/fr` URLs leaves SEO incomplete but not product-breaking.

---

## 9. Estimated footprint

| Area | Files (approx.) |
|------|-----------------|
| New i18n libs | 4–6 |
| Middleware | 1 |
| IQ layout or wrapper | 1–2 |
| Switcher + href helper | 2 |
| Assessment + scoring + questions | 3–5 |
| Funnel clients + landing | 3–4 |
| Metadata pages | 2–8 |
| Sitemap | 1 |
| Smoke script | 1 |
| **Total** | **~18–28** for v1 core; **+10–15** for phase 2 (slug + legal + contextual) |

See **`i18n-stage5c-iq-implementation-plan-2026-05-21.md`** for phased PR breakdown and QA checklist.
