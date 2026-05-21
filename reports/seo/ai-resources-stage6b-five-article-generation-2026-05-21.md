# AI Resources Stage 6B — five-article generation

**Date:** 2026-05-21  
**Pack:** `ai-resources-2026-05-21`  
**Model:** `gpt-5.5` (standard + smart)  
**AUTO_PUBLISH:** 0 — all posts must be `review_needed`

## Topics

| Slug | topic_id | status | error |
|------|----------|--------|-------|
| best-scholarship-search-engines-international-students | 0ed0a845-1df6-48ec-95b5-8553079e3524 | done |  |
| scholarshiptop-vs-fastweb | a4b3f5da-4563-46e2-bff3-d5005dbc030e | done |  |
| scholarshiptop-vs-scholarships-com | 9132690f-a4d4-4ebb-a043-1fa9e7596083 | done |  |
| best-free-scholarship-websites-without-spam | 5df9f4a9-2601-4993-8a43-326f1c94ef74 | done |  |
| best-scholarship-websites-for-graduate-students | a8bdd407-566f-4b56-8630-37547268505c | done |  |

## Posts

| Slug | post_id | status | words | title |
|------|---------|--------|-------|-------|
| best-scholarship-search-engines-international-students | 8d0d578c-de38-40bf-a3c7-66bac2637bb1 | review_needed | 1041 | Best Scholarship Search Engines for International  |
| scholarshiptop-vs-fastweb | d20f6684-f8af-4501-9b5e-c1c613b13f74 | review_needed | 913 | ScholarshipTop vs Fastweb: Which Scholarship Platf |
| scholarshiptop-vs-scholarships-com | 461277cf-c5e7-47b9-b9f4-242d58c09858 | review_needed | 828 | ScholarshipTop vs Scholarships.com: Which Site Sho |
| best-free-scholarship-websites-without-spam | fe08ee54-8742-41f0-b8a6-f847dcc1bd30 | review_needed | 950 | Best Free Scholarship Websites Without Spam |
| best-scholarship-websites-for-graduate-students | b9e85f8b-6335-45a9-939b-6b7e20fa0eac | review_needed | 1103 | Best Scholarship Websites for Graduate Students |

## Meta / excerpt

### best-scholarship-search-engines-international-students

- **title:** Best Scholarship Search Engines for International Students
- **meta_title:** Best Scholarship Search Engines for International Students
- **meta_description:** Compare scholarship search engines for international students, including strengths, limitations, signup notes, and tips for finding verified awards.
- **excerpt:** Compare scholarship search engines for international students by eligibility clarity, country filters, provider context, and verification habits.

### scholarshiptop-vs-fastweb

- **title:** ScholarshipTop vs Fastweb: Which Scholarship Platform Is Better?
- **meta_title:** ScholarshipTop vs Fastweb: Which Is Better?
- **meta_description:** Compare ScholarshipTop vs Fastweb for scholarship discovery, matching, international usefulness, filters, pros, cons, and best-fit student use cases.
- **excerpt:** A practical comparison of ScholarshipTop vs Fastweb, including filtering, international usefulness, U.S. scholarship search, pros, cons, and best-fit student use cases.

### scholarshiptop-vs-scholarships-com

- **title:** ScholarshipTop vs Scholarships.com: Which Site Should Students Use?
- **meta_title:** ScholarshipTop vs Scholarships.com: Which to Use?
- **meta_description:** Compare ScholarshipTop and Scholarships.com by fit, filters, international usefulness, pros, cons, and how students should use each site.
- **excerpt:** A practical comparison of ScholarshipTop and Scholarships.com for students choosing between a modern discovery platform and a legacy U.S.-focused scholarship directory.

### best-free-scholarship-websites-without-spam

- **title:** Best Free Scholarship Websites Without Spam
- **meta_title:** Best Free Scholarship Websites Without Spam
- **meta_description:** Find legit free scholarship websites with less spam. Compare ScholarshipTop, BigFuture, CareerOneStop, Fastweb, Going Merry, and more with safety tips.
- **excerpt:** Compare legit free scholarship websites, learn what each one is best for, and use a safer workflow to reduce spam while searching for college funding.

### best-scholarship-websites-for-graduate-students

- **title:** Best Scholarship Websites for Graduate Students
- **meta_title:** Best Scholarship Websites for Graduate Students
- **meta_description:** Find the best scholarship websites for graduate students, including discovery tools, fellowship databases, university portals, and international funding resour…
- **excerpt:** A practical comparison of scholarship websites for graduate students, including search tools, fellowship databases, university pages, and international funding resources.


## Quality gates

### best-scholarship-search-engines-international-students

- meta_title: yes
- meta_description: yes
- excerpt: yes
- hasQuickAnswer: true
- hasComparisonCards: true
- noWideTable: true
- hasProsCons: true
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 2
- noFakeNumberOne: true
- noBulletsPlaceholder: true

### scholarshiptop-vs-fastweb

- meta_title: yes
- meta_description: yes
- excerpt: yes
- hasQuickAnswer: true
- hasComparisonCards: true
- noWideTable: true
- hasProsCons: true
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 2
- noFakeNumberOne: true
- noBulletsPlaceholder: true

### scholarshiptop-vs-scholarships-com

- meta_title: yes
- meta_description: yes
- excerpt: yes
- hasQuickAnswer: true
- hasComparisonCards: true
- noWideTable: true
- hasProsCons: true
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 2
- noFakeNumberOne: true
- noBulletsPlaceholder: true

### best-free-scholarship-websites-without-spam

- meta_title: yes
- meta_description: yes
- excerpt: yes
- hasQuickAnswer: true
- hasComparisonCards: true
- noWideTable: true
- hasProsCons: false
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 0
- noFakeNumberOne: true
- noBulletsPlaceholder: true

### best-scholarship-websites-for-graduate-students

- meta_title: yes
- meta_description: yes
- excerpt: yes
- hasQuickAnswer: true
- hasComparisonCards: true
- noWideTable: true
- hasProsCons: false
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 2
- noFakeNumberOne: true
- noBulletsPlaceholder: true

## Failures

_None_

## Status violations

_None — all review_needed_

## Run notes

- **Deployed UI baseline:** `ff0675a` (pilot rendering hotfix)
- **Supabase host:** production (`qlqlvhgosxhuibzhfsnh.supabase.co`)
- **Env:** `OPENAI_MODEL_STANDARD=gpt-5.5`, `OPENAI_MODEL_SMART=gpt-5.5`, `CONTENT_HUB_AUTO_PUBLISH=0`, `CONTENT_HUB_POSTS_PER_RUN=5`, `CONTENT_HUB_BATCH_LIMIT=5`, `CONTENT_HUB_SOURCE=ai-resources-2026-05-21`
- **Production writes:** enabled only during generation; `CONTENT_HUB_ALLOW_PRODUCTION_WRITES` commented out after completion
- **Transient failure:** first worker pass hit `image_brief` Zod object (gpt-5.5); fixed via `normalizeImageBriefField` in `validators.ts`, rebuilt, resumed 2 remaining slugs
- **First-pass SEO retry:** `scholarshiptop-vs-fastweb` failed once on object `image_brief`, succeeded on immediate retry before dist fix

## Guardrails

- Generation count: 5 slugs only (not 29)
- Pilot `best-scholarship-websites`: published, not regenerated
- No publish, no ES/FR, no auth/billing/Lemon/IQ/migrations/RLS changes
- No commit/push in this stage
- List articles may use **Strengths / Limitations** platform cards instead of literal “Pros/Cons” headings — manual editorial pass recommended where `hasProsCons` is false

## Git status (snapshot)

```
 M app/layout.tsx
 M components/ui/Navbar/Navlinks.tsx
 M middleware.ts
 M reports/seo/i18n-language-switcher-audit-2026-05-19.json
 M reports/seo/i18n-language-switcher-audit-2026-05-19.md
 M reports/seo/i18n-locale-link-audit-2026-05-19.json
 M reports/seo/i18n-locale-link-audit-2026-05-19.md
 M reports/seo/i18n-visible-text-audit-2026-05-19.json
 M reports/seo/i18n-visible-text-audit-2026-05-19.md
 M scripts/i18n-visible-text-audit.ts
 M services/content-hub/dist/config/env.js
 M services/content-hub/dist/jobs/publishNextPost.js
 M services/content-hub/dist/lib/aiResourcesPack.js
 M services/content-hub/dist/lib/articleMatchingNotifier.js
 M services/content-hub/dist/lib/contentTargets.js
 M services/content-hub/dist/lib/extractImageUrlFromFalJson.js
 M services/content-hub/dist/lib/fal.js
 M services/content-hub/dist/lib/html.js
 M services/content-hub/dist/lib/image/addWatermark.js
 M services/content-hub/dist/lib/imageConfig.js
 M services/content-hub/dist/lib/links.js
 M services/content-hub/dist/lib/logger.js
 M services/content-hub/dist/lib/markdown.js
 M services/content-hub/dist/lib/prompts.js
 M services/content-hub/dist/lib/related.js
 M services/content-hub/dist/lib/scholarshipMatching.js
 M services/content-hub/dist/lib/types.js
 M services/content-hub/dist/lib/validators.js
 M services/content-hub/dist/lib/variation.js
 M services/content-hub/dist/scripts/auditContentHubHealth.js
 M services/content-hub/dist/scripts/diagnoseArticleMetricsFail.js
 M services/content-hub/dist/scripts/requeueProblemContentTopics.js
 M services/content-hub/dist/scripts/seedTopics.js
 M services/content-hub/dist/seo/prePublishSeoGuard.js
 M services/content-hub/dist/seo/seoTelegramNotify.js
 M services/content-hub/src/lib/aiResourcesPack.ts
 M services/content-hub/src/lib/prompts.ts
 M services/content-hub/src/lib/validators.ts
?? .cursor/settings.json
?? .env.local.bak-stage4d
?? .env.local.prod-backup
?? app/iq/layout.tsx
?? components/iq/IqLanguageSwitcher.tsx
?? components/iq/IqLocaleProvider.tsx
?? components/iq/IqLocaleShellNotice.tsx
?? docs/seo-new-content-warnings.json
?? lib/iq/
?? reports/cloudflare/
?? reports/seo/ai-resources-stage6a4-pilot-publish-smoke-2026-05-21.md
?? reports/seo/ai-resources-stage6a7-ui-hotfix-deploy-smoke-2026-05-21.md
?? reports/seo/ai-resources-stage6b-five-article-generation-2026-05-21.md
?? reports/seo/i18n-fix-without-db-plan-2026-05-21.md
?? reports/seo/i18n-full-translation-gap-audit-2026-05-21.csv
?? reports/seo/i18n-full-translation-gap-audit-2026-05-21.md
?? reports/seo/i18n-full-translation-gap-audit-run-2026-05-21.json
?? reports/seo/i18n-p0-hotfix-post-deploy-smoke-2026-05-21.md
?? reports/seo/i18n-p0-ui-static-cleanup-post-deploy-2026-05-21.md
?? reports/seo/i18n-requires-db-translation-plan-2026-05-21.md
?? reports/seo/i18n-stage4c-category-pilot-deploy-smoke-2026-05-21.md
?? reports/seo/i18n-stage4d-resource-field-map-2026-05-21.md
?? reports/seo/i18n-stage4d-resource-pilot-code-deploy-2026-05-21.md
?? reports/seo/i18n-stage4d-resource-pilot-production-seed-smoke-2026-05-21.md
?? reports/seo/i18n-stage4d-resource-quality-gates-2026-05-21.md
?? reports/seo/i18n-stage4d-resource-seo-policy-2026-05-21.md
?? reports/seo/i18n-stage4d-resource-translation-method-plan-2026-05-21.md
?? reports/seo/i18n-stage4d-resources-pilot-audit-2026-05-21.md
?? reports/seo/i18n-stage4d-resources-pilot-candidates-2026-05-21.csv
?? reports/seo/i18n-stage4d-resources-pilot-inventory-2026-05-21.md
?? reports/seo/i18n-stage5a-full-private-product-iq-gap-audit-2026-05-21.csv
?? reports/seo/i18n-stage5a-full-private-product-iq-gap-audit-2026-05-21.md
?? reports/seo/i18n-stage5a-next-implementation-plan-2026-05-21.md
?? reports/seo/i18n-stage5c-iq-copy-inventory-2026-05-21.csv
?? reports/seo/i18n-stage5c-iq-implementation-plan-2026-05-21.md
?? reports/seo/i18n-stage5c-iq-localization-audit-2026-05-21.md
?? scripts/ai-resources-stage6a-export-qa.ts
?? scripts/ai-resources-stage6a-inspect-post.ts
?? scripts/ai-resources-stage6a-snapshot.ts
?? scripts/ai-resources-stage6b-five-generation.ts
?? scripts/cloudflare/
?? scripts/publish-ai-resource-pilot.ts
?? scripts/seo/i18n-full-translation-gap-audit-run.ts
?? scripts/seo/i18n-stage4c4-production-deploy-smoke.ts
?? scripts/seo/i18n-stage4d-post-seed-db-verify.ts
?? scripts/seo/i18n-stage4d-resources-pilot-inventory.ts
?? scripts/seo/i18n-stage5a-production-audit-run.ts
?? scripts/seo/i18n-stage5c-1-iq-locale-smoke.ts
?? scripts/seo/i18n-stage5c-iq-copy-inventory.ts
?? scripts/seo/i18n-ui-static-cleanup-smoke.ts
```
