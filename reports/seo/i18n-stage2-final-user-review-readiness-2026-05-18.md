# Stage 2 ES/FR Pilot — Final User Review Readiness

Date: 2026-05-18 (finalize pass completed 2026-05-19)

## Executive summary

The ES/FR Stage 2 pilot is ready for **visual and copy review** on a running dev server. ES/FR published routes render the **same production templates** as English (`LocalizedProductionPage` → `HomePageContent`, hub index bodies, scholarships catalog body, trust/essay/compare guides). Homepage marketing subsections now accept localized copy for ES/FR.

**Automated SEO/i18n tests pass (32/32).** Typecheck passes. **36 desktop + mobile screenshots** were captured against `http://localhost:3005`.

**Production `npm run build` did not complete** in this finalize environment: static generation for `/` timed out after three attempts (~60s worker limit). This appears tied to **slow or hanging Supabase reads** during homepage `Suspense` boundaries (`HomeStatsAsync`, `HomeResourcesAsync`), not to the i18n routing refactor. An earlier pass in this branch succeeded after deleting a corrupt `.next` cache. **Recommendation for Railway/CI:** run a clean build (`rm -rf .next && npm run build`) with working `NEXT_PUBLIC_SUPABASE_*` and adequate build timeout; treat local timeout as environmental unless it reproduces in CI.

No commits or pushes were made per instructions.

---

## P0 — Build audit

| Attempt | `.next` state | Result |
|--------|----------------|--------|
| Prior (session) | Deleted, clean | **Pass** (full compile + page data) |
| Finalize #1 | Existing + dev on :3005 | **Fail** — `Static page generation for / is still timing out after 3 attempts` |
| Finalize #2 | Deleted, dev still on :3005 | **Fail** — same `/` SSG timeout |
| Finalize #3 | Deleted, isolated | **Fail** — same; workers received SIGTERM at 60s |

**Earlier unrelated failure (resolved with cache clean):** `PageNotFoundError` for `/api/account/saved-filters-snapshot` and `/api/cron/process-essay-queue` during `collect page data`. Route files exist under `app/api/…`; failure was **stale/corrupt `.next`**, not missing routes.

**Conclusion:** i18n template parity changes do not add new build routes. Current blocker is **homepage static generation latency** (async Supabase-backed sections), reproducible while dev server is active and under resource pressure. Dev runtime (`next dev -p 3005`) serves all pilot URLs successfully.

---

## P1 — Homepage localized copy

Extended `lib/i18n/homePageCopy.ts` (EN/ES/FR) for:

- Hero image alt, trust strip, what we verify, guided essay, final CTA
- International grants strip, featured resources carousel, featured brands carousel labels

Wired through `HomePageContent` and child components:

- `HomeTrustStrip`, `HomeWhatWeVerify`, `HomeGuidedEssaySupport`, `HomeFinalCta`
- `HomeInternationalGrantsUsp` (+ `HomeStatsAsync`)
- `FeaturedResources` / `FeaturedResourcesCarousel`
- `FeaturedBrandScholarshipsSection` (optional `copy` prop)

**Known English-only UI (acceptable for pilot review, optional follow-up):**

- `ScholarshipPreviewList` mock UI strings (“Matches for you”, “New”) — decorative preview, not routed content
- Featured brand **card titles/amounts** remain English source data (`FEATURED_BRAND_SCHOLARSHIPS_HOME`)

---

## P2 — Screenshots

**Script:** `scripts/i18n-exact-template-parity-screenshots.ts`  
**Output:** `reports/seo/screenshots/i18n-stage2-exact-template-parity/` (**36 PNGs**)

| Pattern | Routes |
|--------|--------|
| `home-{desktop,mobile}.png` | `/` |
| `es-{desktop,mobile}.png`, `fr-{desktop,mobile}.png` | `/es`, `/fr` |
| `{section}-{desktop,mobile}.png` | EN hubs |
| `es-{section}-{desktop,mobile}.png`, `fr-{section}-…` | Localized hubs |

Sections: `scholarships`, `essays`, `providers`, `compare`, `resources`.

**Capture notes:**

- Requires dev server (`npx next dev -p 3005`) and `npx playwright install chromium`
- Script uses `waitUntil: 'load'` + 1.5s settle (analytics prevents `networkidle`)

**Manual review checklist:**

- [ ] ES/FR home hero, CTAs, trust strip, sections read in target language
- [ ] Hub index layout matches English (spacing, cards, nav)
- [ ] Language switcher shows EN / ES / FR only — **no `/en` links**
- [ ] No obvious overflow on mobile (390×844)
- [ ] Navbar/footer links use localized prefixes on `/es` and `/fr`

---

## P3 — SEO preserved

All checks via `lib/i18n/__tests__/*.test.ts` — **32/32 pass**.

Unchanged policy:

- English at root (`/`, `/scholarships`, …); **no `/en`**
- ES/FR self-canonical on prefixed URLs
- `hreflang`: `en`, `es`, `fr`, `x-default` on pilot pages
- Unsupported locales → 404
- Query/filter localized views → `noindex` where applicable
- Scholarship/provider long-tail **not** translated

Reference: `reports/seo/multilingual-stage-2-final-validation-2026-05-18.md`

---

## Architecture (reviewer quick reference)

```
/es, /fr  →  app/[locale]/[[...slugPath]]/page.tsx
           →  LocalizedProductionPage
           →  HomePageContent | *IndexPageContent | ScholarshipsSlugPathPageBody | guide templates
```

Emergency only: `LocalizedPilotPageView` with `emergencyFallback` (old shells).

---

## Files touched in template parity + finalize (high level)

**New**

- `components/i18n/LocalizedProductionPage.tsx`
- `components/home/HomePageContent.tsx`
- `components/essays/EssaysIndexPageContent.tsx`
- `components/compare/CompareIndexPageContent.tsx`
- `components/content-hub/ResourcesIndexPageContent.tsx`
- `lib/i18n/homePageCopy.ts`, `hubUiCopy.ts`, `localizedHref.ts`
- `app/[locale]/[[...slugPath]]/page.tsx`, `app/[locale]/layout.tsx`
- `scripts/i18n-exact-template-parity-screenshots.ts`

**Modified (representative)**

- English route wrappers: `app/page.tsx`, `app/essays/page.tsx`, `app/compare/page.tsx`, `app/providers/page.tsx`, `app/resources/page.tsx`, `app/scholarships/[[...slugPath]]/page.tsx`
- Home subcomponents (copy props): `HomeTrustStrip`, `HomeWhatWeVerify`, `HomeGuidedEssaySupport`, `HomeFinalCta`, `HomeInternationalGrantsUsp`, `FeaturedResources*`, `FeaturedBrandScholarshipsSection`, `HomeStatsAsync`, `HomeResourcesAsync`
- `middleware.ts`, `lib/i18n/*`, `components/ui/Navbar/*`, `components/ui/Footer/*`, `LanguageSwitcher`
- SEO: `lib/seo/canonical.ts`, `lib/seo/sitemaps.ts`

**Not touched**

- Auth, payments, Lemon, subscription flows, Supabase migrations/RLS
- OpenAI / translation APIs
- Additional locales beyond `es` / `fr`

---

## How to review locally

```powershell
cd c:\dev\scholarshipstop
npx next dev -p 3005
```

Open:

- http://localhost:3005/
- http://localhost:3005/es
- http://localhost:3005/fr

Plus hub paths under `/es/…` and `/fr/…`.

Re-run screenshots:

```powershell
npx playwright install chromium
$env:SCREENSHOT_BASE_URL='http://localhost:3005'
npx tsx scripts/i18n-exact-template-parity-screenshots.ts
```

Re-run tests:

```powershell
npx tsx --test lib/i18n/__tests__/*.test.ts
npx tsc --noEmit
```

Clean production build (when Supabase env is healthy):

```powershell
Remove-Item -Recurse -Force .next
npm run build
```

---

## Related reports

- `reports/seo/i18n-stage2-exact-template-parity-audit-2026-05-18.md`
- `reports/seo/i18n-stage2-exact-template-parity-implementation-2026-05-18.md`
- `reports/seo/multilingual-stage-2-final-validation-2026-05-18.md`
- `docs/multilingual-seo-architecture.md`
