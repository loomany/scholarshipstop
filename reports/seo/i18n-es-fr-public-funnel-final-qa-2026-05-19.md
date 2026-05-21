# ES/FR public + funnel final QA (2026-05-19)

## Executive summary

| Area | Status |
|------|--------|
| ES/FR public SEO visible UI | **Ready** — 0 blocking English UI (116 pages audited) |
| ES/FR funnel (`/get-scholarships`, `/signin/*`) | **Ready** — localized UI, noindex, locale preserved |
| Navbar / footer locale | **Ready** — click smoke 18/18 pass |
| Pricing / subscription | **Option B** — hidden on ES/FR nav (payment-coupled) |
| DB long-tail content | **Not translated** (by design) |
| Build + unit tests | **Pass** |

**Remaining non-blocking gaps:** some internal links on ES/FR static/resource pages still point to English-only targets (DB scholarship cards on home, provider pagination, non-pilot resource slugs). These do not reset locale for pilot hub navigation when using sidebar/CTA fixes shipped in this pass.

---

## What was fixed (this session)

### Scholarships hub UI (Zone A)

- **`ScholarshipsSidebar`**: localized `aria-label` / `title` for International Friendly, subscription/guest unlock tooltips, matches-new indicator.
- **`lib/i18n/scholarshipsHubUiCopy.ts`**: new sidebar + `continueSearch` dictionary keys (EN/ES/FR).
- **`ContinueScholarshipSearchCardGrid`**: full ES/FR copy; locale-aware pilot + hub hrefs.
- **`localizedScholarshipHubTabHref`**: `/es|fr/scholarships/hub/{segment}` helper.
- **`ScholarshipsHubPageClient`**: locale-prefixed sidebar tab hrefs, international-friendly href, router normalization.
- **`app/[locale]/scholarships/[[...slugPath]]/page.tsx`**: serves localized hub subpaths under `/es|fr/scholarships/...`.
- **`scholarshipHubPath.hubResolvedFromPathname`**: strips locale prefix before parsing.
- **`LocalizedPilotPage` / catalog intro `hrefForPath`**: hub quick-links resolve to localized hub URLs.

### Funnel + auth (Zone B) — prior work in branch, verified

- `/es/get-scholarships`, `/fr/get-scholarships` — quiz UI via `funnelUiCopy`, noindex, post-auth → localized hub.
- `/es/signin`, `/fr/signin` (+ views) — `authUiCopy`, noindex, locale sign-in links in navbar.
- Playwright `scripts/i18n-funnel-click-smoke.ts` — 10/10 pass.

### Audits

- `scripts/i18n-visible-text-audit.ts` — attribute scan + funnel paths; link rules respect `isExplicitEnglishOnlyInternalLink` for Zone C.
- `scripts/i18n-locale-link-audit.ts` — funnel path enforcement; nav/footer click tests.

---

## Pricing / subscription decision (Stage D)

**Option B — keep hidden**

- `/subscription` is auth/payment-coupled (Lemon, session state).
- No `/es/pricing` or `/fr/pricing`; Pricing/Tarifs removed from ES/FR nav.
- Documented in `reports/seo/i18n-full-route-localization-inventory-2026-05-19.md`.

---

## Audit results

| Audit | Result |
|-------|--------|
| Visible text (`i18n-visible-text-audit-2026-05-19`) | **0** blocking UI, **0** blocking attrs, 116 pages |
| Funnel click smoke (`i18n-funnel-click-smoke-2026-05-19`) | **10/10** pass |
| Locale link crawl (nav clicks) | **18/18** pass (prior run) |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | **46** pass (incl. `localizedScholarshipHubTabHref`) |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

---

## Route coverage

| Route class | ES | FR | Index | Notes |
|-------------|----|----|-------|-------|
| Pilot static hubs | ✅ | ✅ | yes | `/es/scholarships`, resources, essays, etc. |
| Hub tabs | ✅ | ✅ | yes | `/es/scholarships/hub/*` via new catch-all |
| Funnel | ✅ | ✅ | noindex | get-scholarships, signin |
| Auth billing | EN only | hidden | — | subscription |
| DB scholarship detail | EN | EN | yes (EN) | allowed English |

---

## Allowed English on ES/FR (non-blocking)

- ScholarshipTop, IQ, STEM, FAFSA, GPA, SAT, ACT
- Official provider / university / scholarship names
- Amounts, dates, USD
- DB-backed listing titles and descriptions (Zone C)

---

## Intentionally not translated

- Scholarship/provider/CMS long-tail (Zone C)
- Private account deep UI (`/account`, `/onboarding`, …) — audit only
- OpenAI SEO generators, Supabase writes, migrations, Lemon/RLS

---

## Future work

- [DB translation plan](i18n-db-content-translation-plan-2026-05-19.md)
- [Full route inventory](i18n-full-route-localization-inventory-2026-05-19.md)
- Provider hub pagination hrefs under `/es/providers?page=N`
- Home featured scholarship cards → English detail URLs (Zone C; OK until DB translation pipeline)

---

## OpenAI API

**Not used** in this pass. All copy written manually in `lib/i18n/*Copy.ts` dictionaries.

---

## What was not touched

- Auth/session/Supabase logic
- Lemon / payment / subscription billing
- Mass DB translation
- Commit / push
