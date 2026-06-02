# AI Resources Stage 6B.2 — five-article publish smoke

**Date:** 2026-05-21  
**Script:** `scripts/ai-resources-stage6b2-publish-five.ts`  
**Rows updated:** 5  
**Publish:** slug-filtered only (no publish-next / publish-unpublished)

## Guardrails

| Action | Run? |
|--------|------|
| Publish only 5 Stage 6B slugs | Yes |
| Other review_needed posts | No |
| Generation / batch 24/29/30 | No |
| ES/FR | No |
| Git commit/push | No |

## DB before / after

| Slug | post_id | status before | status after | published_at |
|------|---------|---------------|--------------|---------------|
| best-scholarship-search-engines-international-students | 8d0d578c-de38-40bf-a3c7-66bac2637bb1 | review_needed | published | 2026-05-21T21:40:19.854+00:00 |
| scholarshiptop-vs-fastweb | d20f6684-f8af-4501-9b5e-c1c613b13f74 | review_needed | published | 2026-05-21T21:40:19.854+00:00 |
| scholarshiptop-vs-scholarships-com | 461277cf-c5e7-47b9-b9f4-242d58c09858 | review_needed | published | 2026-05-21T21:40:19.854+00:00 |
| best-free-scholarship-websites-without-spam | fe08ee54-8742-41f0-b8a6-f847dcc1bd30 | review_needed | published | 2026-05-21T21:40:19.854+00:00 |
| best-scholarship-websites-for-graduate-students | b9e85f8b-6335-45a9-939b-6b7e20fa0eac | review_needed | published | 2026-05-21T21:40:19.854+00:00 |

## Preflight (before publish)

| Slug | category | internal links | table | disclaimer |
|------|----------|----------------|-------|------------|
| best-scholarship-search-engines-international-students | ai | 2 | no | yes |
| scholarshiptop-vs-fastweb | ai | 2 | no | yes |
| scholarshiptop-vs-scholarships-com | ai | 2 | no | yes |
| best-free-scholarship-websites-without-spam | ai | 6 | no | yes |
| best-scholarship-websites-for-graduate-students | ai | 2 | no | yes |

## Live URLs

- https://scholarshiptop.com/resources/best-scholarship-search-engines-international-students
- https://scholarshiptop.com/resources/scholarshiptop-vs-fastweb
- https://scholarshiptop.com/resources/scholarshiptop-vs-scholarships-com
- https://scholarshiptop.com/resources/best-free-scholarship-websites-without-spam
- https://scholarshiptop.com/resources/best-scholarship-websites-for-graduate-students

## ISR revalidate

- `/resources`: OK
- `/resources?cat=ai`: OK
- `/resources/best-scholarship-search-engines-international-students`: OK
- `/resources/scholarshiptop-vs-fastweb`: OK
- `/resources/scholarshiptop-vs-scholarships-com`: OK
- `/resources/best-free-scholarship-websites-without-spam`: OK
- `/resources/best-scholarship-websites-for-graduate-students`: OK

## Production smoke

| URL | HTTP | no table | no 3–5 bullets | no Type ??? | no IQ CTA | no deadline passed | canonical | internal links |
|-----|------|----------|----------------|-------------|-----------|-------------------|-----------|------------------|
| /resources/best-scholarship-search-engines-international-students | 200 | true | true | true | true | true | true | true |
| /resources/scholarshiptop-vs-fastweb | 200 | true | true | true | true | true | true | true |
| /resources/scholarshiptop-vs-scholarships-com | 200 | true | true | true | true | true | true | true |
| /resources/best-free-scholarship-websites-without-spam | 200 | true | true | true | true | true | true | true |
| /resources/best-scholarship-websites-for-graduate-students | 200 | true | true | true | true | true | true | true |
| /resources?cat=ai | 200 | true | true | true | true | true | true | true |
| /es/resources/best-scholarship-search-engines-international-students | 404 | true | true | true | true | true | false | false |
| /fr/resources/best-scholarship-search-engines-international-students | 404 | true | true | true | true | true | false | false |

### Hub check (`?cat=ai`)

All six AI-pack slugs present in hub HTML (pilot + 5 newly published):

| Slug | In hub |
|------|--------|
| `best-scholarship-websites` (pilot) | yes |
| `best-scholarship-search-engines-international-students` | yes |
| `scholarshiptop-vs-fastweb` | yes |
| `scholarshiptop-vs-scholarships-com` | yes |
| `best-free-scholarship-websites-without-spam` | yes |
| `best-scholarship-websites-for-graduate-students` | yes |

## Sitemap (`/sitemaps/resources.xml`)

- `best-scholarship-search-engines-international-students`: **present**
- `scholarshiptop-vs-fastweb`: **present**
- `scholarshiptop-vs-scholarships-com`: **present**
- `best-free-scholarship-websites-without-spam`: **present**
- `best-scholarship-websites-for-graduate-students`: **present**
- `best-scholarship-websites`: **present**
