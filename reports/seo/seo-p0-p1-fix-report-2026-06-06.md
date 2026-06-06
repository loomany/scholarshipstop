# ScholarshipTop SEO P0/P1 Recovery Report - 2026-06-06

## 1. Verdict

**PASS_WITH_WARNINGS**

Code-level P0/P1 recovery is complete and verified in a local production-like build.

Main evidence:

- `npm run build` passes.
- `npm run test:seo-lib` passes: 82/82.
- `npm run seo:validate-jsonld` passes: 13 JSON-LD sample blocks across 10 cases.
- Scholarship-specific targeted tests pass: 17/17 in the final targeted run.
- Runtime grep finds old audited phrases only inside guard tests, not runtime app/lib/scripts/components output code.
- Local `next start -p 3002` check: `/sitemaps/scholarships-0.xml` returns HTTP 200, valid XML, and 9,755 `<loc>` entries.
- Local HTML checks show 1 H1, no old audit phrases, and expected FAQPage gating on sampled pages.
- Browser hydrated DOM check for `/scholarships/no-essay` shows 1 H1: `No Essay Scholarships USA | Find & Apply`, `index, follow`, no old audit phrase.

Warnings:

- No deploy, git push, production DB writes, production workers, mass regeneration, migrations, or GSC actions were performed because the TZ forbids them without separate approval.
- Production must still be smoke-tested after deploy against the live environment and Google Search Console.
- Local Supabase network was intermittently slow during broad mass-smoke attempts, so I used targeted production-like checks instead of a full 40+ page crawl.

## 2. What was fixed

| Area | Before | After | Files changed | Tests |
|---|---|---|---|---|
| Old audit boilerplate / near-duplicate phrases | Old phrases could render from DB text, JSON bundles, provider text, UI copy, and generators. | Sanitizers remove old serialized text at render/model layer; runtime generators and UI copy no longer contain old exact phrases. | `lib/scholarships/scholarshipSeoSanitizers.ts`, `lib/scholarships/supabase.ts`, `lib/scholarships/scholarshipSeoContentStore.ts`, `lib/scholarships/longTailSeoStore.ts`, provider/content/script copy files | `scholarshipNearDuplicateGuard`, `scholarshipDetailSeo`, runtime `rg` |
| Sitemap child route 500 / expensive builder | Child sitemap could route through full builder and fail; local view schema mismatches could produce empty guarded output. | Child sitemap uses direct range builder; service-role source reads base `scholarships`; public fallback uses safe-listing select/filter; guarded failures do not return 500. | `lib/seo/sitemaps.ts`, `lib/seo/scholarshipDetailSitemapPolicy.ts`, `lib/seo/__tests__/sitemapRouteDispatch.test.ts` | `/sitemaps/scholarships-0.xml` 200 with 9,755 locs; sitemap route tests |
| Noindex/sitemap consistency | Weak/noindex detail pages risked sitemap inclusion or schema mismatch. | Sitemap builder uses detail index policy; noindex/weak rows are excluded; sitemap entries are policy-screened before loc output. | `lib/seo/scholarshipDetailSitemapPolicy.ts`, `lib/seo/sitemaps.ts` | `scholarshipDetailSitemapPolicy`, `test:seo-lib` |
| Multiple H1s | Hidden server H1 and skeleton H1 could duplicate visible H1; hydration could replace SEO listing H1 with generic tab title. | Hidden/skeleton duplicate H1 removed; skeleton uses styled div; routeScope pages keep SEO H1 after hydration via `fallbackPageTitle`. | `app/scholarships/scholarshipsSlugPathPageBody.tsx`, `components/scholarships/ScholarshipsHubShellSkeleton.tsx`, `app/scholarships/ScholarshipsHubPageClient.tsx` | H1 guard test; HTTP and Browser checks |
| FAQPage schema on noindex/weak pages | Noindex scholarship details and noindex overlap content could still emit FAQPage. | Scholarship detail FAQPage is gated by index policy; static/dynamic resource and essay overlap pages suppress FAQPage when canonicalized/noindex. | `app/scholarships/[[...slugPath]]/layout.tsx`, `lib/scholarships/scholarshipDetailSeo.ts`, `app/resources/[slug]/page.tsx`, `app/essays/[slug]/page.tsx`, static guide components | JSON-LD validation; HTML checks on noindex overlap pages |
| Serialized generic summaries in HTML/RSC | Old generic summaries could survive in serialized fields even if visible text improved. | Mapper sanitizes `summaryShort`, `summaryLong`, `whoCanApplyText`, `notificationDetails`, `paymentDetails`; provider and SEO bundle text sanitized too. | `lib/scholarships/supabase.ts`, `lib/providers/providerProfileServer.ts`, `lib/providers/providerHubServer.ts`, `components/providers/ProvidersHubCard.tsx` | Sanitizer tests; HTML checks |
| Double-brand metadata | Detail/listing titles could become `ScholarshipTop | ... | ScholarshipTop`. | Scholarship metadata now uses absolute title text for relevant scholarship routes. | `app/scholarships/scholarshipSlugLayoutMetadata.ts` | `test:seo-lib`, sampled titles |
| Legacy category/long-tail URL | `/scholarships/category/no-essay` could hit an invalid category path. | It redirects to canonical `/scholarships/no-essay`. | `app/scholarships/category/[slug]/page.tsx` | Local HTTP check: 307 Location `/scholarships/no-essay` |
| Generator regression risk | SEO scripts still had exact old boilerplate fallback phrases. | Exact phrases removed from generator fallbacks/prompts/scripts. | `scripts/generate-seo-scholarship-ai.ts`, `scripts/seo-worker-generate.ts`, SEO rewrite/audit scripts | Runtime `rg`; tests |

## 3. P0 status

| P0 item | Status | Evidence |
|---|---|---|
| Landing pages old phrases | PASS | Runtime grep found old phrases only in `lib/scholarships/__tests__/*`; local HTML for `/scholarships/no-essay`, `/scholarships/closing-soon`, `/scholarships/category/stem` had `oldPhrase=False`. |
| `sitemaps/scholarships-0.xml` 500 | PASS | Local production server returned `status=200`, `locs=9755`, `len=1604032`. Route no longer depends on full sitemap builder for a child shard. |
| Noindex/sitemap consistency | PASS | Detail sitemap rows go through `getScholarshipDetailSitemapDecision`; noindex overlap pages canonicalize away and are not scholarship sitemap detail locs. |
| One H1 | PASS | HTTP checks: no-essay, closing-soon, provider, category, resource, detail sample all had `h1=1`. Browser hydrated DOM for no-essay had exactly one H1. |
| FAQPage on noindex | PASS | `/resources/no-essay-scholarships-guide` and `/essays/no-essay-scholarships`: `robots=noindex, follow`, `faqPage=False`. Scholarship detail JSON-LD omits FAQPage for noindex records in tests. |
| Serialized old summaries | PASS | `cleanScholarshipGeneratedText` removes old serialized summaries; mapper/provider/SEO stores apply sanitizer; tests cover old serialized audit summaries. |
| Old SEO generator scripts | PASS | Exact old phrases removed from runtime generator fallback strings; runtime grep clean outside tests. |
| Title/meta/schema/canonical/robots/sitemap | PASS_WITH_WARNINGS | Local checks passed on sampled routes; production/GSC inspection still requires deploy and manual approval. |
| Minimal E-E-A-T | PASS_WITH_WARNINGS | Existing trust/byline/source layers preserved; no fake experts or fake claims added. Further E-E-A-T expansion should be a separate content task. |

## 4. Sample validation

Local base: `http://127.0.0.1:3002` after `npm run build` and `npm run start -- -p 3002`.

| URL | HTTP | Robots | In sitemap | H1 count | Old phrases | FAQ schema | Verdict |
|---|---:|---|---|---:|---|---|---|
| `/sitemaps/scholarships-0.xml` | 200 | n/a | n/a | n/a | n/a | n/a | PASS - 9,755 locs |
| `/sitemap.xml` | 200 | n/a | includes scholarship shard | n/a | n/a | n/a | PASS |
| `/scholarships/international-family-award-at-aberystwyth-university-2026-international-family-award-at-ab` | 200 | `index, follow` | yes, first shard sample | 1 | no | no | PASS |
| `/scholarships/no-essay` | 200 | `index, follow` | yes, SEO sitemap intent winner | 1 | no | no | PASS |
| `/scholarships/closing-soon` | 200 | `index, follow` | yes, SEO sitemap intent winner | 1 | no | no | PASS |
| `/scholarships/category/stem` | 200 | implicit index | category sitemap policy | 1 | no | yes | PASS |
| `/providers` | 200 | implicit index | provider sitemap policy | 1 | no | no | PASS |
| `/resources/verified-staff-pages-scholarship-trust` | 200 | `index, follow` | resource sitemap policy | 1 | no | no | PASS |
| `/resources/no-essay-scholarships-guide` | 200 | `noindex, follow` | no, canonical overlap | 1 | no | no | PASS |
| `/essays/no-essay-scholarships` | 200 | `noindex, follow` | no, canonical overlap | 1 | no | no | PASS |
| `/scholarships/category/no-essay` | 307 | n/a | no | n/a | n/a | n/a | PASS - redirects to `/scholarships/no-essay` |

Browser hydrated DOM sample:

| URL | Title | H1s | Robots | Old phrase |
|---|---|---|---|---|
| `/scholarships/no-essay` | `No Essay Scholarships USA | Find & Apply | ScholarshipTop` | `No Essay Scholarships USA | Find & Apply` | `index, follow` | false |

## 5. Tests run

| Command | Result |
|---|---|
| `git status --short` | Pre-start dirty worktree recorded; pre-existing `package-lock.json`, `services/content-hub/dist/*`, and old untracked reports were not touched/staged. |
| `git log --oneline -10` | Checked before work. |
| `npm -v` | `11.11.0` |
| `node -v` | `v24.14.1` |
| `npx tsx --test lib/scholarships/__tests__/scholarshipNearDuplicateGuard.test.ts lib/scholarships/__tests__/scholarshipDetailSeo.test.ts lib/seo/__tests__/sitemapRouteDispatch.test.ts` | PASS, 17/17 final targeted run. |
| `npm run test:seo-lib` | PASS, 82/82. |
| `npm run seo:validate-jsonld` | PASS, 13 JSON-LD blocks across 10 cases. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS. |
| Runtime `rg` for old audit phrases in `app lib scripts components` | PASS: matches only in guard tests. |
| Local `next start -p 3002` HTTP checks | PASS on selected P0/P1 pages; sitemap shard 9,755 locs. |
| Browser hydrated DOM check | PASS on `/scholarships/no-essay`: one correct H1 after hydration. |

## 6. Files changed

Primary SEO/runtime files:

- `app/scholarships/[[...slugPath]]/layout.tsx`
- `app/scholarships/scholarshipsSlugPathPageBody.tsx`
- `app/scholarships/ScholarshipsHubPageClient.tsx`
- `app/scholarships/scholarshipSlugLayoutMetadata.ts`
- `app/scholarships/category/[slug]/page.tsx`
- `app/resources/[slug]/page.tsx`
- `app/essays/[slug]/page.tsx`
- `components/scholarships/ScholarshipsHubShellSkeleton.tsx`
- `components/content-hub/StaticScholarshipGuidePage.tsx`
- `components/essays/StaticEssayGuidePage.tsx`
- `components/providers/ProvidersHubCard.tsx`
- `lib/scholarships/scholarshipSeoSanitizers.ts`
- `lib/scholarships/supabase.ts`
- `lib/scholarships/scholarshipSeoContentStore.ts`
- `lib/scholarships/longTailSeoStore.ts`
- `lib/scholarships/scholarshipDetailSeo.ts`
- `lib/seo/sitemaps.ts`
- `lib/seo/scholarshipDetailSitemapPolicy.ts`
- `lib/providers/providerProfileServer.ts`
- `lib/providers/providerHubServer.ts`

Tests:

- `lib/scholarships/__tests__/scholarshipNearDuplicateGuard.test.ts`
- `lib/scholarships/__tests__/scholarshipDetailSeo.test.ts`
- `lib/seo/__tests__/sitemapRouteDispatch.test.ts`

Copy/generator cleanup:

- `app/faq/page.tsx`
- `app/providers/[id]/page.tsx`
- `components/trust/TrustPageTemplate.tsx`
- `lib/i18n/homePageCopy.ts`
- `lib/i18n/providerDetailUiCopy.ts`
- `lib/i18n/compareDetailUiCopy.ts`
- `lib/i18n/resourceDetailUiCopy.ts`
- `lib/seo/siteTitle.ts`
- `lib/trust/trustPageContent.ts`
- `lib/content-hub/aiResourcesPackShared.ts`
- `lib/content-hub/polishAiResourceStage6cDrafts.ts`
- `lib/content-hub/polishAiResourceStage6dDrafts.ts`
- `lib/scholarships/seoScholarshipPrompts.ts`
- `lib/scholarships/universityHubJsonLd.ts`
- `scripts/audit-scholarship-application-readiness.ts`
- `scripts/generate-seo-scholarship-ai.ts`
- `scripts/seo-worker-generate.ts`
- `scripts/seo/i18n-stage5e-scholarship-detail-pilot-smoke.ts`
- `scripts/seo/rewrite-scholarship-seo-content-stage3.ts`

Report:

- `reports/seo/seo-p0-p1-fix-report-2026-06-06.md`

Not part of this commit scope / pre-existing:

- `package-lock.json`
- `services/content-hub/dist/*` deleted files
- old untracked reports from 2026-06-02

## 7. What still needs manual approval

These were intentionally **not** done:

- Production deploy to Railway/Vercel.
- Git push.
- Production DB cleanup/regeneration.
- Production DB writes.
- Production workers.
- Mass production content regeneration.
- Migrations.
- Irreversible redirects beyond a safe local app redirect for `/scholarships/category/no-essay`.
- Google Search Console sitemap resubmission or URL Inspection.

Recommended after approval:

1. Deploy this branch.
2. Run production smoke on:
   - `/sitemap.xml`
   - `/sitemaps/scholarships-0.xml`
   - `/scholarships/no-essay`
   - `/scholarships/closing-soon`
   - 5-10 scholarship detail URLs from live sitemap
   - noindex overlap pages `/resources/no-essay-scholarships-guide` and `/essays/no-essay-scholarships`
3. Confirm production sitemap shard remains non-empty and under 50,000 locs.
4. Confirm no noindex URL appears in production sitemap samples.
5. In GSC, resubmit `/sitemap.xml` and inspect the highest-value indexable URLs.
6. Consider a separate content decision for old 404 pillar intents such as `/scholarships/medical` and `/scholarships/law`: restore, redirect, or intentionally leave replaced by canonical guide pages.
7. Consider production DB cleanup/regeneration only after this render-level safety net is deployed and verified.

## 8. Explicit non-actions

No deploy was performed.
No git push was performed.
No production DB writes were performed.
No production workers were run.
No migrations were created or run.
No mass content regeneration was run.
No force push was performed.

