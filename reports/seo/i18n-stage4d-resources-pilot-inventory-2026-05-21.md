# Stage 4D — Resources / CMS route inventory (2026-05-21)

**Scope:** Audit/plan only. Read-only production probe included.

---

## Production read-only (2026-05-21)

| Check | Result |
| --- | --- |
| `content_translations` exists | Yes (`qlql…fsnh`) |
| Category pilot rows | **22** (`scholarship_category`, published, 11 ES + 11 FR) |
| `resource_article` rows | **0** |
| Published `content_posts` with slug | **900** |
| RLS anon | Published-only (unchanged from Stage 4B) |

---

## 1. Route inventory

| Route pattern | File path(s) | Data source | Static vs DB | Index / sitemap | ES/FR today | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| `/resources` | `app/resources/page.tsx` → `ResourcesIndexPageContent` | `content_posts` (all published) + `STATIC_SCHOLARSHIP_GUIDES` | Mixed hub | Index (base); **noindex** on filtered/paginated query views | `/es/resources`, `/fr/resources`: hub UI translated; **cards still EN titles** from DB | **Medium** — mixed-language hub until grid policy |
| `/resources/[slug]` | `app/resources/[slug]/page.tsx` | `fetchPublishedContentPostBySlug` **or** `getStaticScholarshipGuide(slug)` | DB article **or** 9 static TS guides | All published posts in `resources` sitemap bucket; static guides appended | **404** for CMS slugs under `/es|fr` (no dynamic route) | **High** — body HTML, FAQ, schema, auto-links |
| `/resources/how-to-apply-for-scholarships` | `app/resources/how-to-apply-for-scholarships/page.tsx` | Dedicated page + `resourceShell` static pilot | Static | In sitemap via static guide list | ES/FR shell via `extendedResourceShellPages` | Low (already piloted) |
| `/resources/scholarship-deadlines-explained` | `app/resources/scholarship-deadlines-explained/page.tsx` | Static shell | Static | Sitemap | ES/FR shell | Low |
| `/resources/combine-multiple-scholarships` | `app/resources/combine-multiple-scholarships/page.tsx` | Static shell | Static | Sitemap | ES/FR shell | Low |
| `/resources/medical-scholarships-guide` | `app/resources/medical-scholarships-guide/page.tsx` | Static shell | Static | Sitemap | ES/FR shell | Low |
| `/resources/scholarships-for-international-students-guide` | `app/resources/scholarships-for-international-students-guide/page.tsx` | Static shell | Static | Sitemap | ES/FR shell | Low |
| `/es/resources/{path}` | `app/[locale]/[[...slugPath]]/page.tsx` → `LocalizedProductionPage` | `lib/i18n/staticTranslations` registry only | Static pilot pages | `locale-{es,fr}-resources` sitemap bucket (static pilot URLs) | **Only** paths in `STAGE2_EXTENDED_STATIC_PATHS` / extended maps | Low for static; **N/A for CMS** |
| `/es/resources/[cms-slug]` | **Not implemented** | Would be `content_translations` + `content_posts` | DB (future) | Future `locale-es-resources-db` bucket | **404 today** | **High** (implementation) |

### Loaders and builders

| Concern | Location |
| --- | --- |
| DB fetch (detail) | `lib/content-hub/contentPostsServer.ts` — `fetchPublishedContentPostBySlug`, `revalidate: 300` |
| DB fetch (index) | `fetchAllPublishedContentPostsListFields`, filters in `resourcesIndexFilters` / `resourceTaxonomy` |
| Sitemap EN | `lib/seo/sitemaps.ts` — `fetchAllPublishedContentPostsForSitemap()` + `STATIC_SCHOLARSHIP_GUIDES` |
| Static guides | `lib/resources/staticScholarshipGuides.ts` (9 slugs) |
| Metadata EN article | `app/resources/[slug]/page.tsx` `generateMetadata` — `meta_title`, `meta_description`; **no hreflang** for CMS posts today |
| Metadata EN hub | `app/resources/page.tsx` — `buildStage2EnglishPilotAlternates` for hub only |
| Body render | `SafeContentPostBody`, TOC (`resourceArticleBodyToc`), inline FAQ extract, `applyAutoInternalLinks` |
| FAQ | `content_posts.faq` JSON + inline FAQ from HTML |
| Schema | `BlogPosting` + `BreadcrumbList` + optional `FAQPage` (EN strings from post) |
| Related scholarships | `getRelatedScholarshipsForResourceArticle` → hub links (EN paths) |
| Internal links | `applyAutoInternalLinks` (env-gated), manual links in HTML |
| Noindex | Hub: paginated/filtered/search views (`robots: noindex, follow`) |
| Notify on publish | `app/api/internal/resources/notify-published/route.ts` |

### Static resource coverage already translated (exclude from CMS pilot)

**`STAGE2_EXTENDED_STATIC_PATHS` (14 resource paths):** 9 file-based guides via `[slug]` + 5 dedicated routes + `how-to-find-scholarships` full ES/FR in `extendedResourceSlugPages`.

**Do not duplicate in `resource_article` pilot:** same slugs if they also exist as `content_posts` rows (currently **0** collisions in DB for static guide slugs).

---

## 2. Pilot candidate scoring (automated)

Full CSV: `i18n-stage4d-resources-pilot-candidates-2026-05-21.csv` (900 rows).

**Scoring note:** Raw rank favors content-hub **families** (`verify-*`, `organize-*`, `trustworthy-*`). For implementation, use **curated batch** below (diversity + lower duplicate risk).

### Curated first batch (25) — recommended for Stage 4D.1

| # | slug | Rationale |
| --- | --- | --- |
| 1 | `avoid-scholarship-scams-targeting-families` | High intent, low legal risk, trust |
| 2 | `types-of-scholarships-usa-explained` | Pillar explainer |
| 3 | `how-to-write-a-winning-scholarship-essay` | Core application intent |
| 4 | `how-to-proofread-scholarship-essay` | Essay workflow |
| 5 | `how-to-write-a-thank-you-letter-after-winning-a-scholarship` | Evergreen procedural |
| 6 | `how-to-get-recommendation-letters-for-scholarships` | Application docs |
| 7 | `four-year-scholarship-plan-college` | Planning / evergreen |
| 8 | `track-scholarship-deadlines-usa` | Organization intent |
| 9 | `best-scholarship-tracker-templates-students` | Tools/templates |
| 10 | `verify-scholarship-emails-usa` | Scam verification (one verify flagship) |
| 11 | `trustworthy-scholarship-review-online` | Trust evaluation |
| 12 | `scholarship-faq-low-gpa-students` | FAQ format pilot |
| 13 | `scholarship-faq-comparing-multiple-offers` | FAQ |
| 14 | `scholarship-faq-no-recommendation-letters` | FAQ |
| 15 | `scholarship-faq-applying-late` | FAQ |
| 16 | `organize-scholarship-applications-by-difficulty` | Organization (one organize flagship) |
| 17 | `organize-scholarship-applications-notion` | Tool-specific |
| 18 | `how-to-track-scholarships-international-students` | International segment |
| 19 | `how-to-find-scholarships-for-international-students` | International segment |
| 20 | `how-to-write-scholarship-essay-as-international-student` | International segment |
| 21 | `how-to-get-full-scholarship-usa` | High search intent |
| 22 | `graduate-scholarship-application-checklist` | One checklist flagship only |
| 23 | `verify-scholarship-eligibility-usa` | Eligibility verification |
| 24 | `scholarship-faq-school-students-applying-early` | FAQ |
| 25 | `scholarship-faq-parents-worried-scams` | Parent trust / scam FAQ |

**Defer to batch 2 (26–50):** additional FAQ pages, one more verify/organize article each, `usa-scholarships-learning-differences`, international niche lists — after batch 1 smoke.

**Explicitly defer / exclude from pilot:**

- `create-trusted-scholarship-guides-*`, `scholarship-transparency-checklist-*`, `scholarship-application-checklist-*` clusters (template-near duplicates)
- `find-scholarships-usa-*-deadlines` month-specific slugs
- `trustworthy-scholarship-database-2026` (year in slug)
- Narrow `usa-{field}-scholarships` list pages unless strategically chosen

### Automated top 25 (reference only)

See previous section in generated run — dominated by verify/organize/trustworthy families; **do not use blindly**.

---

## 3. Regenerate inventory

```bash
npx tsx scripts/seo/i18n-stage4d-resources-pilot-inventory.ts
```

Requires production-linked `.env.local` (read-only `content_posts` select).
