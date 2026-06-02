# AI Resources Stage 6D — next five generation + polish

**Date:** 2026-05-22  
**Source:** `ai-resources-2026-05-22`  
**Model:** `gpt-5.5`  
**AUTO_PUBLISH:** 0  
**Publish:** none  
**Commit/push:** not performed

## Generated slugs

| Slug | topic_id | post_id | status | word_count | polish |
|------|----------|---------|--------|------------|--------|
| how-to-verify-ai-generated-scholarship-lists | ef7cc7c8-cf21-4d9b-ba39-475c19d27444 | a4b8e173-f284-4307-b3cc-cb28298410aa | review_needed | 1162 | yes |
| chatgpt-prompts-for-scholarship-search | fb60a6ac-60b2-43cd-a619-692a54ba799c | 6637f7bf-2688-4a3b-90f5-f9ca60dc2d7c | review_needed | 1012 | yes |
| ai-tools-for-international-students-looking-for-scholarships | 432fa1b9-64cb-463b-80a9-ff7f89898c9b | a0cf7622-c4f6-4ec9-b058-c4e534a2e3db | review_needed | 1073 | yes |
| how-to-use-ai-without-missing-scholarship-deadlines | 5c18454f-629c-45cf-ba25-62cecbc74278 | ab19be1f-8cb9-436f-8a8e-80929b069807 | review_needed | 1177 | yes |
| scholarship-search-checklist-using-ai | b8496e73-4cdf-4a71-9a5e-0d37585fa5b8 | 3aa78afa-d98e-47f4-a055-26b0f211d725 | review_needed | 1039 | yes |

## QA table (after polish)

| Slug | no KP1 | no KP2 | no KP3 | no bare paths | FAQ ok | S/L | links≥2 | review_needed | disclaimer |
|------|--------|--------|--------|---------------|--------|-----|---------|-----------------|------------|
| how-to-verify-ai-generated-scholarship-lists | true | true | true | true | true | true | true (6) | true | true |
| chatgpt-prompts-for-scholarship-search | true | true | true | true | true | true | true (9) | true | true |
| ai-tools-for-international-students-looking-for-scholarships | true | true | true | true | true | true | true (7) | true | true |
| how-to-use-ai-without-missing-scholarship-deadlines | true | true | true | true | true | true | true (6) | true | true |
| scholarship-search-checklist-using-ai | true | true | true | true | true | true | true (7) | true | true |

## Protected content unchanged

### Six live Stage 6B (published)

- `best-scholarship-websites`: status=`published`, body unchanged=true
- `best-scholarship-search-engines-international-students`: status=`published`, body unchanged=true
- `scholarshiptop-vs-fastweb`: status=`published`, body unchanged=true
- `scholarshiptop-vs-scholarships-com`: status=`published`, body unchanged=true
- `best-free-scholarship-websites-without-spam`: status=`published`, body unchanged=true
- `best-scholarship-websites-for-graduate-students`: status=`published`, body unchanged=true

### Five Stage 6C.1 drafts (review_needed)

- `can-chatgpt-help-find-scholarships`: status=`review_needed`, body unchanged=true
- `how-to-use-chatgpt-to-search-for-scholarships`: status=`review_needed`, body unchanged=true
- `best-ai-tools-for-finding-scholarships`: status=`review_needed`, body unchanged=true
- `ai-scholarship-search-vs-traditional-databases`: status=`review_needed`, body unchanged=true
- `best-sites-to-find-fully-funded-scholarships`: status=`review_needed`, body unchanged=true

## Deliverables

- Report: `C:\dev\scholarshipstop\reports\seo\ai-resources-stage6d-next-five-generation-2026-05-22.md`
- Previews: `C:\dev\scholarshipstop\reports\seo\ai-resources-stage6d-polished-previews-2026-05-22/*.md`
- Polished data: `data/content/polished/*-stage6d-2026-05-22.md`
- Topic pack: `C:\dev\scholarshipstop\data\content\ai-resources-topics-stage6d-2026-05-22.json`
- Script: `scripts/ai-resources-stage6d-next-five-generation.ts`
- Polish: `lib/content-hub/polishAiResourceStage6dDrafts.ts`

## Run notes

- First pass: 3/5 generated; slug `how-to-use-ai-without-missing-scholarship-deadlines` hit an OpenAI **seo_brief timeout** (~3.5 min). Resumed with second `--run`; all 5 completed.
- Second `--polish-only` pass: fixed backtick bare paths (`/scholarships`, etc.) → all QA `noBarePaths` true.

## Run notes

- First pass: 3/5 generated; `how-to-use-ai-without-missing-scholarship-deadlines` hit an OpenAI **seo_brief timeout** on first attempt. Resumed with second `--run`; all 5 completed.
- Extra `--polish-only` pass: fixed backtick bare paths; all QA `noBarePaths` true.

## Guardrails

- Generated exactly **5** new articles (not bulk pack)
- No publish; no ES/FR; no IQ/UI/build/sitemap/auth/billing/schema changes
- `CONTENT_HUB_ALLOW_PRODUCTION_WRITES` disabled after run
