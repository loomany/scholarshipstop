# ScholarshipTop SEO Implementation Map

Date: 2026-05-16

## Scope Mapped

| Area | Primary implementation files | Notes |
| --- | --- | --- |
| Homepage | `app/page.tsx`, `components/home/HomeTrustStrip.tsx`, `components/home/HomeWhatWeVerify.tsx`, `components/seo/HomePageJsonLd.tsx`, `lib/seo/homePageJsonLd.ts` | Strong product positioning already exists, but trust/methodology links need to be more explicit. |
| Global footer/internal trust links | `components/ui/Footer/SiteFooterNav.tsx`, `components/ui/Footer/SiteFooter.tsx` | Footer currently links to About, Help, policies, FAQ. It needs verification, editorial, corrections, disclaimer, ranking, and money-policy links. |
| Scholarships catalog root | `app/scholarships/[[...slugPath]]/page.tsx`, `app/scholarships/scholarshipsSlugPathPageBody.tsx`, `app/scholarships/ScholarshipsHubPageClient.tsx` | Root catalog has a short intro and filters. Needs a stronger explanatory layer and internal links without changing filter/search/pagination behavior. |
| Scholarship cards | `components/scholarships/ScholarshipCard.tsx`, `lib/scholarships/scholarshipCatalog.ts`, `app/scholarships/scholarshipsData.ts` | Cards have provider, verified badge, award/deadline/requirements, geo badges, chips. Snippets can be made less templated and cards can show source/effort/deadline intelligence. |
| Scholarship detail pages | `app/scholarships/[[...slugPath]]/layout.tsx`, `app/scholarships/scholarshipsSlugPathPageBody.tsx`, `app/scholarships/ScholarshipDetailPageClient.tsx`, `components/scholarships/scholarship-detail/ScholarshipDetailSections.tsx`, `lib/scholarships/scholarshipUiModel.ts` | Detail pages already include quick decision, requirements, before-you-apply, FAQ, related hubs, and schema. Need visible source confidence, missing-data flags, difficulty, deadline urgency, review status, and methodology/disclaimer links. |
| Provider pages | `app/providers`, `components/providers`, `lib/providers` | Out of scope for P0 except existing detail links to provider profiles. No provider data model changes planned. |
| Category SEO pages | `app/scholarships/category/[slug]/page.tsx`, `components/scholarships/ScholarshipCategoryPostListingSeo.tsx`, `app/scholarships/category/categoryExpertContent.ts`, `lib/scholarships/categorySeoAllowlist.ts` | Promoted categories are allowlisted. Post-listing copy and FAQ exist; add methodology/disclaimer links and quality-policy guidance. |
| Country/cross-country SEO pages | `app/scholarships/scholarshipCountrySeo.ts`, `data/seo-cross-country-routes.json`, `app/scholarships/scholarshipsSlugPathPageBody.tsx`, `lib/seo/crossCountrySitemapEntries.ts` | Cross-country manifest already limits sitemap/indexed entries. Need keep this gate and add clearer quality rules for future expansion. |
| Resources/blog | `app/resources/page.tsx`, `app/resources/[slug]/page.tsx`, `lib/content-hub/resourcesSection.ts`, `lib/content-hub/contentPostsServer.ts` | Resource hub exists and published posts feed sitemap. New static trust/resource pages should not create duplicate scam-warning URLs. |
| Sitemap | `app/sitemap.xml/route.ts`, `app/sitemaps/[slug]/route.ts`, `lib/seo/sitemaps.ts` | Query URLs are not included. Scholarship sitemap skips `is_indexable=false`; category/cross-country/manifest sitemap entries are already gated. Add central quality policy for future publishing and avoid mass URL removals. |
| Robots/noindex/canonical | `app/robots.ts`, `app/scholarships/[[...slugPath]]/page.tsx`, `app/resources/page.tsx`, `lib/seo/canonical.ts`, route metadata files | `/scholarships?page=2+` already uses `noindex, follow` and canonical `/scholarships`. Keep this unchanged. |
| Scholarship route resolving | `lib/scholarships/seoScholarshipResolve.ts`, `app/scholarships/[[...slugPath]]/layout.tsx`, `app/scholarships/scholarshipsSlugPathPageBody.tsx` | Main critical risk: unknown single scholarship-like slug can soft-404 because layout returns children when DB record is missing. |
| JSON-LD/schema | `app/scholarships/[[...slugPath]]/layout.tsx`, `app/scholarships/scholarshipListingJsonLd.ts`, `components/seo/HomePageJsonLd.tsx`, `lib/seo/homePageJsonLd.ts`, category/country post-listing components | Existing detail schema uses Organization, EducationalOccupationalProgram, BreadcrumbList, FAQPage. Listing pages use ItemList. Need align visible trust blocks with schema and add guidance in docs. |
| Pagination | `components/scholarships/ScholarshipsPagination.tsx`, `app/scholarships/[[...slugPath]]/page.tsx`, list payload builders | Existing canonical/noindex policy for non-canonical query states must remain untouched. |
| Paywall/blur logic | `components/scholarships/ScholarshipCard.tsx`, `app/scholarships/ScholarshipDetailPageClient.tsx`, `lib/scholarships/scholarshipObscuring.ts`, subscription lock helpers | Must not weaken subscription logic. SEO-critical trust labels may be visible, but premium external links and locked provider text remain controlled by existing gates. |

## Current Risks Found Before Editing

1. Unknown single-segment `/scholarships/{slug}` routes can become soft-404 because detail lookup failure is handled after a streaming boundary.
2. Trust pages are incomplete: About exists, but methodology, editorial policy, corrections, ranking, disclaimer, and monetization pages are missing or not linked.
3. Homepage has trust claims but not enough explicit methodology and data-standard proof.
4. Catalog root still reads like a filtered list before it reads like an application-planning workflow.
5. Cards have useful facts but not a compact "intelligence" row for fit, source, effort, and deadline clarity.
6. Detail pages already have AI decision sections, but need a non-fake, facts-only trust layer that flags missing data and review status.
7. Programmatic routes have several gates, but future publishing rules are spread across code and docs.
8. Category and country pages have SEO copy, but methodology/disclaimer links are not consistently surfaced.

## Planned Change Zones

P0:

- `app/scholarships/[[...slugPath]]/layout.tsx` for true 404 on missing single scholarship records.
- `lib/seo/seoQualityPolicy.ts` for central quality/status helpers used by cards/details and future sitemap/publishing rules.
- Trust pages under `app/*/page.tsx` plus a reusable trust page component/content model.
- `components/ui/Footer/SiteFooterNav.tsx` for trust links.
- `components/home/HomeTrustStrip.tsx`, `components/home/HomeWhatWeVerify.tsx`, and `app/page.tsx` for homepage trust positioning.
- `app/scholarships/scholarshipsSlugPathPageBody.tsx` for catalog explanatory copy.
- `components/scholarships/ScholarshipCard.tsx` for card intelligence strip and safer snippets.
- `components/scholarships/scholarship-detail/ScholarshipDetailSections.tsx` and `app/scholarships/ScholarshipDetailPageClient.tsx` for visible detail-page intelligence.
- `docs/seo-quality-policy.md` for future publishing rules.

P1:

- Category/country post-listing components for methodology/disclaimer links.
- Resource architecture links and AI-friendly schema/citation blocks where the existing content hub supports them safely.

## Zones Not Touched

- Auth, onboarding, Supabase RLS, subscription purchase flow, paywall pricing, saved/ignored workflows, submitted/started workflows, essay tools, and payment/refund logic.
- Database writes or migrations.
- Bulk URL deletions from sitemap.
- Fake testimonials, fake expert identities, or fabricated verification dates.

## Verification Plan

| Check | Purpose |
| --- | --- |
| `npx tsc --noEmit` | Type safety after route/component/helper edits. |
| `npm run build` | Next.js build, metadata, route, and server/client boundary validation. |
| `curl -I /scholarships/not-a-real-seo-page-xyz` on local/prod target | Confirm true HTTP 404 after soft-404 fix. |
| `curl -I /scholarships?page=2` or HTML meta inspection | Confirm `noindex, follow` and canonical root remain in place. |
| Visual checks for `/`, `/scholarships`, sample detail pages, category/country pages, trust pages, mobile/desktop | Confirm new blocks fit existing UI and do not overload the experience. |
| HTML/meta spot checks | Confirm H1, canonical, robots, schema, source/review/methodology/disclaimer signals are visible where expected. |
