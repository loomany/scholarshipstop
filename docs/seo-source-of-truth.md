# SEO source of truth (inventory)

This document maps **where SEO-related data comes from** for each major page family: runtime (Next.js), audit (`scripts/audit-seo-pages.ts`), fix scripts, generators, revalidation, and known sync risks.

> **Note:** Audit **title/meta length scoring** and thresholds live only in `scripts/audit-seo-pages.ts` (`getTitleRangeForType` / `getMetaRangeForType`, `checkRangeSoft`, etc.). This file does **not** redefine them.

---

## Page type: scholarship detail

**Runtime source**

- Route: dynamic `/scholarships/[[...slugPath]]` with shared layout metadata.
- Files: [`app/scholarships/[[...slugPath]]/layout.tsx`](app/scholarships/[[...slugPath]]/layout.tsx), [`app/scholarships/scholarshipSlugLayoutMetadata.ts`](app/scholarships/scholarshipSlugLayoutMetadata.ts).
- Data: `getScholarshipDetailServer` / `Scholarship` model — title via `buildScholarshipDetailSeoTitle`, description via `metaDescription()` (seo excerpt, summary, or template).
- ISR: `revalidate` on catch-all page ([`app/scholarships/[[...slugPath]]/page.tsx`](app/scholarships/[[...slugPath]]/page.tsx) exports `revalidate = 300`).
- Body / FAQ / SEO blocks: client-heavy [`app/scholarships/ScholarshipDetailPageClient.tsx`](app/scholarships/ScholarshipDetailPageClient.tsx) may refetch `/api/scholarships/[slug]` after load — **metadata is still from layout/server scholarship row**.

**Audit source**

- Enumeration: `listAuditPages()` builds `scholarship_detail` entries from `fetchActiveScholarshipsForScript()` (same script env as other Supabase reads).
- Extraction: `extractScholarshipDetailInternal` in [`scripts/audit-seo-pages.ts`](scripts/audit-seo-pages.ts) — uses `buildScholarshipDetailSeoTitle`, `detailMetaFallbackDescription`, flags for overview / eligibility / application / FAQ from `Scholarship` fields (`seoOverview`, `seoEligibility`, `seoApplication`, `seoFaq`, `fullContentHtml`, etc.).

**Fix write source**

- [`scripts/fix-seo-from-audit-targeted.ts`](scripts/fix-seo-from-audit-targeted.ts): updates `scholarships` (and related `seo_meta_cache` / `seo_meta_generation_queue` upserts where applicable in that pipeline).

**Generator source**

- Examples: [`scripts/generate-scholarship-detail-seo-ai.ts`](scripts/generate-scholarship-detail-seo-ai.ts), [`scripts/generate-seo-scholarship-ai.ts`](scripts/generate-seo-scholarship-ai.ts), [`scripts/seo-worker-generate.ts`](scripts/seo-worker-generate.ts) — AI/queue-driven SEO fields on `scholarships`.

**Revalidate path/tag**

- After DB writes: ideally `POST /api/revalidate` with path `/scholarships/...` (see Step 4 in rollout plan). **Current targeted fix script does not call revalidate** (gap vs HTML cache).

**Known risks**

- Audit row comes from **bulk** `fetchActiveScholarshipsForScript`; layout may use **per-slug** `getScholarshipDetailServer` — fields must stay aligned or drift appears “fixed in DB but bad in audit”.
- HTTP fallback: if internal extract lacks `title` / `meta` / `h1`, audit uses `fetchHtmlFallback` against `SEO_AUDIT_BASE_URL` — can disagree with DB-only truth.

---

## Page type: provider

**Runtime source**

- Route: [`app/providers/[id]/page.tsx`](app/providers/[id]/page.tsx) — `generateMetadata`: title `${displayName} | Scholarship Provider`, description from `providerMetaDescription(aiDescription, displayName)` (clip ~160).
- Data: `getCachedProviderProfilePage` / [`lib/providers/providerProfileServer.ts`](lib/providers/providerProfileServer.ts).
- ISR: `export const revalidate = 60`.

**Audit source**

- Enumeration: `provider_hub_listing` view + `providers.ai_faq` joined in `listAuditPages()`.
- Extraction: `extractProviderInternal` — title `${displayName} | Scholarship Provider`, meta from `ai_description` or fallback string; FAQ from `ai_faq`; scholarship list signal from `scholarship_count`.

**Fix write source**

- [`scripts/fix-seo-from-audit-targeted.ts`](scripts/fix-seo-from-audit-targeted.ts): `providers` table updates (display/AI fields per script logic).

**Generator source**

- Provider enrichment / SEO-related pipelines (e.g. [`lib/providers/enrichProviderDataCore.ts`](lib/providers/enrichProviderDataCore.ts) used from targeted fix), cron/enrich scripts under `scripts/` (see [`docs/seo-scripts-inventory.md`](seo-scripts-inventory.md)).

**Revalidate path/tag**

- Path: `/providers/{slug}` (param `id` resolves to slug). Revalidate via `POST /api/revalidate` when wired (targeted fix: not unified today).

**Known risks**

- Runtime title **always** includes suffix `| Scholarship Provider`; audit uses the same pattern in `extractProviderInternal` — good alignment for title.
- Meta: runtime clips `ai_description`; audit uses full normalized string for length checks — minor mismatch possible at boundary.

---

## Page type: essay

**Runtime source**

- Routes: hub [`app/essays/page.tsx`](app/essays/page.tsx); article [`app/essays/[slug]/page.tsx`](app/essays/[slug]/page.tsx).
- `generateMetadata` on article: `essay.title`, `essay.meta_description` from `fetchPublishedEssayBySlug` ([`lib/essays/essaysServer.ts`](lib/essays/essaysServer.ts)).
- ISR: essay article page uses `revalidate` export (see file).

**Audit source**

- Enumeration: `essays` table `.select('slug, title, meta_description, content_html, faq')` where `is_published = true`.
- Extraction: `extractEssayInternal` — hub uses hardcoded strings aligned with hub page; articles use DB `title`, `meta_description`, `content_html`, FAQ array.

**Fix write source**

- [`scripts/fix-seo-essays.ts`](scripts/fix-seo-essays.ts): `essays` update (`title`, `meta_description`, optionally FAQ policy per script).

**Generator source**

- [`lib/essays/runEssayGenerationJob.ts`](lib/essays/runEssayGenerationJob.ts), [`scripts/run-manual-essay-guides.ts`](scripts/run-manual-essay-guides.ts), API [`app/api/essay/generate/route.ts`](app/api/essay/generate/route.ts) as applicable.

**Revalidate path/tag**

- [`scripts/fix-seo-essays.ts`](scripts/fix-seo-essays.ts): `POST /api/revalidate` with path `/essays/{slug}`; [`app/api/revalidate/route.ts`](app/api/revalidate/route.ts) may add tag `essay-{slug}` when body tag omitted.

**Known risks**

- Historical `react.cache` on essay fetch was a staleness risk; current code path should be verified in `essaysServer.ts` when auditing “DB updated, HTML old”.

---

## Page type: resources / article (`content_posts`)

**Runtime source**

- Hub: [`app/resources/page.tsx`](app/resources/page.tsx).
- Article: [`app/resources/[slug]/page.tsx`](app/resources/[slug]/page.tsx) — `generateMetadata`: `post.meta_title || post.title`, `post.meta_description`.
- Data: `fetchPublishedContentPostBySlug` ([`lib/content-hub/contentPostsServer.ts`](lib/content-hub/contentPostsServer.ts)).
- ISR: `revalidate = 300` on article page.

**Audit source**

- Enumeration: `content_posts` — `slug, published_at, title, meta_title, meta_description, body_html, faq`, `status = published`.
- Extraction: `extractContentInternal` — title `meta_title ?? title`, meta `meta_description`, body from `body_html`, FAQ parsed from `faq` JSON.

**Fix write source**

- [`scripts/fix-seo-from-audit-targeted.ts`](scripts/fix-seo-from-audit-targeted.ts): `content_posts` updates.

**Generator source**

- [`services/content-hub/src/jobs/runContentJob.ts`](services/content-hub/src/jobs/runContentJob.ts) and related content-hub services.

**Revalidate path/tag**

- Path: `/resources/{slug}`; hub `/resources`. Revalidate not uniformly called from all generators (verify per job).

**Known risks**

- Audit marks hub `/resources` with synthetic copy; article pages rely on DB — ensure hub metadata in audit matches [`app/resources/page.tsx`](app/resources/page.tsx) when hub copy changes.

---

## Page type: compare

**Runtime source**

- University compare: [`app/compare/universities/[slug]/page.tsx`](app/compare/universities/[slug]/page.tsx) — `generateMetadata` uses `compare_pages` row + `resolveAiMetaDescription` for optional AI-resolved description.
- State compare: [`app/compare/states/[slug]/page.tsx`](app/compare/states/[slug]/page.tsx) (same pattern).
- Hubs: `/compare`, `/compare/universities`, `/compare/states` with static-style metadata in pages.
- ISR: `revalidate = 300` on slug pages (see files).

**Audit source**

- Enumeration: `compare_pages` and `state_compare_pages` with `meta_title`, `meta_description`, `content_json`, `ai_verdict`.
- Extraction: `extractCompareInternal` — parses `content_json.body_html`, `content_json.faq`; title `meta_title` or fallback; hubs use hardcoded strings.

**Fix write source**

- [`scripts/fix-seo-from-audit-targeted.ts`](scripts/fix-seo-from-audit-targeted.ts): updates `compare_pages`, `state_compare_pages`, and related institution/state rows where script updates comparison content.

**Generator source**

- Compare AI helpers in [`lib/seo/comparePageAi.ts`](lib/seo/comparePageAi.ts), enqueue/refresh scripts (`scripts/enqueue-university-compare.ts`, `scripts/refresh-state-compare-pages.ts`, etc.).

**Revalidate path/tag**

- Paths: `/compare/universities/{slug}`, `/compare/states/{slug}`; hub paths as above.

**Known risks**

- Runtime may rewrite description via `resolveAiMetaDescription`; audit reads **stored** `meta_description` and JSON body — **intentional divergence** unless audit is extended to mirror that service.

---

## Page type: listing (programmatic scholarship SEO / long-tail)

**Runtime source**

- Same catch-all as detail: [`app/scholarships/scholarshipSlugLayoutMetadata.ts`](app/scholarships/scholarshipSlugLayoutMetadata.ts) resolves manifest SEO JSON, long-tail bundles, drip policy, optional AI meta (`resolveAiMetaDescription` / hub reads per resolved kind).
- Hub empty segments: [`app/scholarships/[[...slugPath]]/page.tsx`](app/scholarships/[[...slugPath]]/page.tsx) `generateMetadata` for `/scholarships` root (canonical / robots with query).

**Audit source**

- Enumeration: manifest paths from `getAllIndexableSeoManifestPathsForSitemap` + long-tail slugs from sitemap helper; **no per-row DB** for listing — `extractScholarshipListingInternal` reads JSON files (`readScholarshipSeoContent` / long-tail file paths via `contentFilePath` / `longTailFilePath`) and `resolveScholarshipSlugPath`.

**Fix write source**

- File-based SEO JSON generators (`scripts/generate-*.ts`, `build-seo-scholarship-routes.ts`, etc.) and worker pipelines — not the same code path as `fix-seo-from-audit-targeted` for DB scholarships.

**Revalidate path/tag**

- Path: `/scholarships/{canonicalPath}` for each listing. Listing content often static JSON on disk — Next ISR still applies to route; on-demand revalidate depends on deployment strategy.

**Known risks**

- Listing audit is **filesystem-first**; runtime uses shared resolvers but may apply drip / AI meta — keep resolver functions in sync (`resolveScholarshipSlugPath`, `readScholarshipSeoContent`).
- Strong risk of “audit green, runtime different” if `SEO_AUDIT_BASE_URL` HTML fallback is used while internal JSON extract failed.

---

## Global: audit HTTP fallback

In [`scripts/audit-seo-pages.ts`](scripts/audit-seo-pages.ts), if internal extract yields missing `title`, `metaDescription`, or `h1`, the audit fetches rendered HTML (`fetchHtmlFallback`) from `SEO_AUDIT_BASE_URL` (or `NEXT_PUBLIC_SITE_URL` / localhost). That path can disagree with Supabase-internal extraction — document per-URL when debugging.

---

## Global: revalidate API

[`app/api/revalidate/route.ts`](app/api/revalidate/route.ts): `POST` JSON `{ path, tag?, secret? }` — `revalidatePath(path)`; optional `revalidateTag`; default essay tag when path under `/essays/`.

Secrets: `REVALIDATE_API_SECRET` (server), scripts often use `SEO_REVALIDATE_BASE_URL` + secret for remote revalidation.

---

## Pre-publish SEO guard (warn-only)

- **App repo:** [`lib/seo/publishGuardRunner.ts`](../lib/seo/publishGuardRunner.ts) — used from essay generation ([`lib/essays/runEssayGenerationJob.ts`](../lib/essays/runEssayGenerationJob.ts)) and [`scripts/run-manual-essay-guides.ts`](../scripts/run-manual-essay-guides.ts). Logs + appends runs to `docs/seo-new-content-warnings.json` (override path with `SEO_NEW_CONTENT_WARNINGS_PATH`). `SEO_QUALITY_WARN_ONLY` defaults to on when unset (`!== '0'`).
- **Content hub:** [`services/content-hub/src/seo/prePublishSeoGuard.ts`](../services/content-hub/src/seo/prePublishSeoGuard.ts) — same behavior, self-contained module; invoked from [`runContentJob.ts`](../services/content-hub/src/jobs/runContentJob.ts) before `schema_json` / insert.
