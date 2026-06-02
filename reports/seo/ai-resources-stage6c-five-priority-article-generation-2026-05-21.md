# AI Resources Stage 6C — five priority article generation

**Date:** 2026-05-21  
**Pack:** `ai-resources-2026-05-21`  
**Model:** `gpt-5.5`  
**Generation:** exactly 5 slugs (sequential, `POSTS_PER_RUN=1`, `BATCH_LIMIT=1`)  
**AUTO_PUBLISH:** 0 — all posts `review_needed`

## Topics

| Slug | topic_id | status | error (truncated) |
|------|----------|--------|-------------------|
| can-chatgpt-help-find-scholarships | 75d76acd-2340-4ebd-9bac-5ef08cf3edb8 | done |  |
| how-to-use-chatgpt-to-search-for-scholarships | 7e0b9bba-6dba-4a20-9c21-719ea6cadedb | done |  |
| best-ai-tools-for-finding-scholarships | 368666f4-1ddc-4149-b716-a91448aaab7d | done |  |
| ai-scholarship-search-vs-traditional-databases | 45cb1964-0ace-457b-a7cd-ef9e2c575689 | done |  |
| best-sites-to-find-fully-funded-scholarships | 67d0a05d-32d0-4909-98b7-2c496e62cabd | done |  |

## Posts

| Slug | post_id | status | word_count | internal links |
|------|---------|--------|------------|------------------|
| can-chatgpt-help-find-scholarships | 2fb9a78f-f555-4d40-b1f5-a8fbdd03d0ed | review_needed | 986 | 0 |
| how-to-use-chatgpt-to-search-for-scholarships | 967ebea0-a679-4426-9bfd-7ad6c49c2b4e | review_needed | 1002 | 2 |
| best-ai-tools-for-finding-scholarships | 223e52d7-432c-45f1-9ff4-9d43dadddf4d | review_needed | 950 | 2 |
| ai-scholarship-search-vs-traditional-databases | 49ddad6b-08b4-4be9-a59d-18f3eb515f9c | review_needed | 1059 | 2 |
| best-sites-to-find-fully-funded-scholarships | f11bf6aa-527a-4c8e-8de0-02b35423fb1e | review_needed | 985 | 0 |

## QA verdict per article

### can-chatgpt-help-find-scholarships

- **verdict:** needs edits
- hasQuickAnswer: true
- noWideTable: true
- hasStrengthsLimitations: true
- hasFaq: false
- hasDisclaimer: true
- internalLinkCount: 0
- noTypeQ: true
- noKeyPoint: false
- no35Bullets: true
- noRawPaths: false
- noFakeNumberOne: true
- **failed checks:** hasFaq, noKeyPoint, noRawPaths

### how-to-use-chatgpt-to-search-for-scholarships

- **verdict:** needs edits
- hasQuickAnswer: true
- noWideTable: true
- hasStrengthsLimitations: false
- hasFaq: false
- hasDisclaimer: true
- internalLinkCount: 2
- noTypeQ: true
- noKeyPoint: false
- no35Bullets: true
- noRawPaths: false
- noFakeNumberOne: true
- **failed checks:** hasStrengthsLimitations, hasFaq, noKeyPoint, noRawPaths

### best-ai-tools-for-finding-scholarships

- **verdict:** needs edits
- hasQuickAnswer: true
- noWideTable: true
- hasStrengthsLimitations: false
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 2
- noTypeQ: true
- noKeyPoint: false
- no35Bullets: true
- noRawPaths: true
- noFakeNumberOne: true
- **failed checks:** hasStrengthsLimitations, noKeyPoint

### ai-scholarship-search-vs-traditional-databases

- **verdict:** needs edits
- hasQuickAnswer: true
- noWideTable: true
- hasStrengthsLimitations: true
- hasFaq: false
- hasDisclaimer: true
- internalLinkCount: 2
- noTypeQ: true
- noKeyPoint: false
- no35Bullets: true
- noRawPaths: true
- noFakeNumberOne: true
- **failed checks:** hasFaq, noKeyPoint

### best-sites-to-find-fully-funded-scholarships

- **verdict:** needs edits
- hasQuickAnswer: true
- noWideTable: true
- hasStrengthsLimitations: false
- hasFaq: true
- hasDisclaimer: true
- internalLinkCount: 0
- noTypeQ: true
- noKeyPoint: false
- no35Bullets: true
- noRawPaths: false
- noFakeNumberOne: true
- **failed checks:** hasStrengthsLimitations, noKeyPoint, noRawPaths

## Failures / budget

_None_

## Status violations

_None — all review_needed_

## Run summary

| Step | Result |
|------|--------|
| Env preflight | `OPENAI_API_KEY` set; models `gpt-5.5`; `AUTO_PUBLISH=0`; `SOURCE=ai-resources-2026-05-21`; prod writes toggled off after run |
| Slug collisions | 0 (no prior posts for these 5) |
| Live published guard | 6 AI articles remain `published` |
| Worker runs | 5 sequential (`POSTS_PER_RUN=1`, `BATCH_LIMIT=1`) |
| OpenAI / budget errors | None |
| Optional 6th (`fake-scholarship-website-red-flags`) | Not run (budget cap) |

## Editorial before publish

All five drafts are `review_needed` (not published). Recommended pass before publish:

1. Replace TL;DR **Key Point N:** bullets with plain bullets (see `polishAiResourceArticleMarkdown.ts` / Stage 6B.3 pattern).
2. Add or expand **Strengths / Limitations** where missing (list-type articles).
3. Ensure FAQ has 4–6 items with 2–4 sentence answers (several FAQ answers are one sentence).
4. Linkify any bare `/scholarships/...` or `/resources/...` paths in markdown.
5. Bump internal `/resources` + `/scholarships` links where count is 0–2 (worker added scholarship URLs; relative internal href counts vary).

Previews: `reports/seo/ai-resources-stage6c-previews-2026-05-21/*.md`

## Guardrails

- Generated **5** priority slugs only (not remaining ~24 pack topics)
- **No publish** — all `review_needed`
- **No ES/FR** translations
- **6 live published** AI articles unchanged: best-scholarship-websites, best-scholarship-search-engines-international-students, scholarshiptop-vs-fastweb, scholarshiptop-vs-scholarships-com, best-free-scholarship-websites-without-spam, best-scholarship-websites-for-graduate-students
- `CONTENT_HUB_ALLOW_PRODUCTION_WRITES` disabled after run
- Previews: `C:\dev\scholarshipstop\reports\seo\ai-resources-stage6c-previews-2026-05-21`
- Hub UI deploy prerequisite: commit `1737b7b` (`fix(resources): polish AI resources hub and live articles`)
