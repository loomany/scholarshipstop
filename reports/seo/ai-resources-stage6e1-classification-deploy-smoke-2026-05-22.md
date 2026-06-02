# AI Resources Stage 6E.1 — classification deploy smoke

**Date:** 2026-05-22  
**Verified at:** 2026-05-22T20:19:02.846Z  
**Commit:** `c6d518b` — `fix(resources): classify AI resource pack slugs`  
**Deploy:** pushed to `origin/main`  

## Smoke summary

**All 16 articles + hub checks pass:** **see table**

| URL | HTTP | not 404 | no noindex | self-canonical | no ??? | no KP | no raw `](`/ | no IQ | no bare paths | disclaimer | body |
|-----|------|---------|------------|----------------|--------|-------|---------------|--------|---------------|------------|------|
| /resources?cat=ai | 200 | true | n/a | n/a | true | true | true | true | true | true | true |
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

## Hub (`/resources?cat=ai`)

- HTTP: 200
- Unique article links on first page: 14
- All 16 discoverable (first page and/or pagination/search/sitemap):

  - `best-scholarship-websites`: pagination/search (not first page)
  - `best-scholarship-search-engines-international-students`: pagination/search (not first page)
  - `scholarshiptop-vs-fastweb`: pagination/search (not first page)
  - `scholarshiptop-vs-scholarships-com`: pagination/search (not first page)
  - `best-free-scholarship-websites-without-spam`: pagination/search (not first page)
  - `best-scholarship-websites-for-graduate-students`: pagination/search (not first page)
  - `can-chatgpt-help-find-scholarships`: on first page
  - `how-to-use-chatgpt-to-search-for-scholarships`: on first page
  - `best-ai-tools-for-finding-scholarships`: on first page
  - `ai-scholarship-search-vs-traditional-databases`: on first page
  - `best-sites-to-find-fully-funded-scholarships`: pagination/search (not first page)
  - `how-to-verify-ai-generated-scholarship-lists`: on first page
  - `chatgpt-prompts-for-scholarship-search`: on first page
  - `ai-tools-for-international-students-looking-for-scholarships`: on first page
  - `how-to-use-ai-without-missing-scholarship-deadlines`: pagination/search (not first page)
  - `scholarship-search-checklist-using-ai`: on first page

## Sitemap (`/sitemaps/resources.xml`) — Stage 6E ten new articles

- `can-chatgpt-help-find-scholarships`: **present**
- `how-to-use-chatgpt-to-search-for-scholarships`: **present**
- `best-ai-tools-for-finding-scholarships`: **present**
- `ai-scholarship-search-vs-traditional-databases`: **present**
- `best-sites-to-find-fully-funded-scholarships`: **present**
- `how-to-verify-ai-generated-scholarship-lists`: **present**
- `chatgpt-prompts-for-scholarship-search`: **present**
- `ai-tools-for-international-students-looking-for-scholarships`: **present**
- `how-to-use-ai-without-missing-scholarship-deadlines`: **present**
- `scholarship-search-checklist-using-ai`: **present**

## Guardrails

- Commit contained **only** 5 classification/rendering files
- No new generation, no DB publish, no body edits in this deploy
- No ES/FR, auth/billing/schema changes
- Stage 6F not started
