# AI Resources Stage 6E.1 — live hotfix

**Date:** 2026-05-22  
**Script:** `scripts/ai-resources-stage6e1-live-hotfix.ts`  
**Write mode:** yes (production DB body updates)  
**Target articles:** 16 AI pack slugs (6 Stage 6B + 10 Stage 6C/6D)  

## Fixes applied

### DB body edits (applied)

- `best-scholarship-websites`: changed=true, fixes=[common-repairs], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `scholarshiptop-vs-scholarships-com`: changed=true, fixes=[stage6b-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/scholarship-platform-comparisons`
- `best-free-scholarship-websites-without-spam`: changed=true, fixes=[stage6b-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/scholarship-search-safety`
- `best-scholarship-search-engines-international-students`: changed=true, fixes=[stage6b-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `scholarshiptop-vs-fastweb`: changed=true, fixes=[stage6b-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/scholarship-platform-comparisons`
- `best-scholarship-websites-for-graduate-students`: changed=true, fixes=[stage6b-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `best-ai-tools-for-finding-scholarships`: changed=true, fixes=[stage6c-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `can-chatgpt-help-find-scholarships`: changed=true, fixes=[stage6c-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `how-to-use-chatgpt-to-search-for-scholarships`: changed=true, fixes=[stage6c-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `ai-scholarship-search-vs-traditional-databases`: changed=true, fixes=[stage6c-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `chatgpt-prompts-for-scholarship-search`: changed=true, fixes=[stage6d-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `ai-tools-for-international-students-looking-for-scholarships`: changed=true, fixes=[stage6d-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `how-to-use-ai-without-missing-scholarship-deadlines`: changed=true, fixes=[stage6d-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`
- `scholarship-search-checklist-using-ai`: changed=true, fixes=[stage6d-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/scholarship-search-safety`
- `how-to-verify-ai-generated-scholarship-lists`: changed=true, fixes=[stage6d-polish, common-repairs-pass2], before=[bare-path, dup-phrase], after=[raw-md-link, bare-path], classify=`ai/scholarship-search-safety`
- `best-sites-to-find-fully-funded-scholarships`: changed=true, fixes=[stage6c-polish, common-repairs-pass2], before=[bare-path], after=[raw-md-link, bare-path], classify=`ai/ai-scholarship-discovery`

### Renderer / taxonomy edits (local code, deploy pending)

- Added `lib/content-hub/aiResourcePackSlugs.ts` — all 16 slugs force `categoryId: ai` (fixes hub `?cat=ai` filter when deployed).
- `shouldShowResourceArticleIqCta(classification, slug)` hides IQ block for pack slugs.
- Reordered AI `SLUG_HINTS` before international hints (avoids mis-classifying `ai-tools-for-international-students…`).
- Renderer/taxonomy: `aiResourcePackSlugs` + `classifyResourceArticle` pack override + `shouldShowResourceArticleIqCta(slug)` — **requires deploy** to hide IQ CTA on live HTML until main is shipped.

## Production smoke (16 articles + hub)

| URL | HTTP | not 404 | no noindex | self-canonical | no ??? | no KP | no `](`/ | no IQ CTA | no bare paths | disclaimer | body |
|-----|------|---------|------------|----------------|--------|-------|-------------|-----------|---------------|------------|------|
| /resources?cat=ai | 200 | true | false | true | true | true | true | true | true | true | true |
| /resources/best-scholarship-websites | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/best-scholarship-search-engines-international-students | 200 | true | true | true | true | true | true | true | false | true | true |
| /resources/scholarshiptop-vs-fastweb | 200 | true | true | true | true | true | true | true | false | true | true |
| /resources/scholarshiptop-vs-scholarships-com | 200 | true | true | true | true | true | true | true | false | true | true |
| /resources/best-free-scholarship-websites-without-spam | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/best-scholarship-websites-for-graduate-students | 200 | true | true | true | true | true | true | true | false | true | true |
| /resources/can-chatgpt-help-find-scholarships | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/how-to-use-chatgpt-to-search-for-scholarships | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/best-ai-tools-for-finding-scholarships | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/ai-scholarship-search-vs-traditional-databases | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/best-sites-to-find-fully-funded-scholarships | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/how-to-verify-ai-generated-scholarship-lists | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/chatgpt-prompts-for-scholarship-search | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/ai-tools-for-international-students-looking-for-scholarships | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/how-to-use-ai-without-missing-scholarship-deadlines | 200 | true | true | true | true | true | true | true | true | true | true |
| /resources/scholarship-search-checklist-using-ai | 200 | true | true | true | true | true | true | true | true | true | true |

### Hub discoverability (`/resources?cat=ai`)

Classification for all 16 is `ai` in codebase after pack override. Hub lists paginated AI articles (16 total).

- `best-scholarship-websites`: not on first page (pagination/search/sitemap OK)
- `best-scholarship-search-engines-international-students`: not on first page (pagination/search/sitemap OK)
- `scholarshiptop-vs-fastweb`: not on first page (pagination/search/sitemap OK)
- `scholarshiptop-vs-scholarships-com`: not on first page (pagination/search/sitemap OK)
- `best-free-scholarship-websites-without-spam`: not on first page (pagination/search/sitemap OK)
- `best-scholarship-websites-for-graduate-students`: not on first page (pagination/search/sitemap OK)
- `can-chatgpt-help-find-scholarships`: visible on first page
- `how-to-use-chatgpt-to-search-for-scholarships`: visible on first page
- `best-ai-tools-for-finding-scholarships`: visible on first page
- `ai-scholarship-search-vs-traditional-databases`: visible on first page
- `best-sites-to-find-fully-funded-scholarships`: not on first page (pagination/search/sitemap OK)
- `how-to-verify-ai-generated-scholarship-lists`: visible on first page
- `chatgpt-prompts-for-scholarship-search`: visible on first page
- `ai-tools-for-international-students-looking-for-scholarships`: visible on first page
- `how-to-use-ai-without-missing-scholarship-deadlines`: visible on first page
- `scholarship-search-checklist-using-ai`: visible on first page

## ISR revalidate

- `/resources`: OK
- `/resources/best-scholarship-websites`: OK
- `/resources/best-scholarship-search-engines-international-students`: OK
- `/resources/scholarshiptop-vs-fastweb`: OK
- `/resources/scholarshiptop-vs-scholarships-com`: OK
- `/resources/best-free-scholarship-websites-without-spam`: OK
- `/resources/best-scholarship-websites-for-graduate-students`: OK
- `/resources/can-chatgpt-help-find-scholarships`: OK
- `/resources/how-to-use-chatgpt-to-search-for-scholarships`: OK
- `/resources/best-ai-tools-for-finding-scholarships`: OK
- `/resources/ai-scholarship-search-vs-traditional-databases`: OK
- `/resources/best-sites-to-find-fully-funded-scholarships`: OK
- `/resources/how-to-verify-ai-generated-scholarship-lists`: OK
- `/resources/chatgpt-prompts-for-scholarship-search`: OK
- `/resources/ai-tools-for-international-students-looking-for-scholarships`: OK
- `/resources/how-to-use-ai-without-missing-scholarship-deadlines`: OK
- `/resources/scholarship-search-checklist-using-ai`: OK
- `/resources?cat=ai`: OK

## Guardrails

- No new article generation
- No ES/FR translation
- No auth/billing/Lemon/schema/RLS/migration changes
- All 16 remain `published`
- No commit/push in this step (owner approval needed for deploy)
- Stage 6F not started
