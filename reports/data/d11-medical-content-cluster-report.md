# D11 Medical Content Cluster Report

Date: 2026-06-01

## Summary

D11 strengthened the existing medical / nursing / pre-med content cluster using the D10 static layer, without creating mass new SEO pages.

## Routes improved

| Route | Change |
|---|---|
| `/resources/medical-scholarships-guide` | Added planning sections (data limits, workforce note, medical school note, source note, cluster links) |
| `/essays/career-goals` | Added healthcare career goals planning section; topic card resolves to STEM-to-medical path; expanded related links |
| Dynamic resources | Shared healthcare topic gating + suppress list for generic/comparison articles |
| Dynamic essays | Shared healthcare topic resolver with expanded keyword match |
| Provider pages | Medical cluster links appear only when strict medical school match exists |

## Topic clusters

- **Medical scholarships:** centered on `/resources/medical-scholarships-guide`
- **Healthcare career goals:** centered on `/essays/career-goals`
- **Pre-med / nursing / healthcare:** dynamic cards only on explicit slug/title/category matches
- **Provider medical school identity:** strict match only; Loyola undergraduate case remains clean

## Skipped (intentionally)

- No new `/resources/nursing-scholarships-guide` page
- No `HealthWorkforceContextBlock` on routes without explicit state signal
- No category-page card wiring for `/scholarships/category/medical` or `/scholarships/nursing` in this pass
- No residency / hospital / NPPES / CMS / Open Payments UI
- No Supabase / Auth / Payments changes
- No canonical / robots / sitemap policy changes

## New shared helper

- `lib/external-data/medicalContentCluster.ts`
  - suppress list for generic comparison articles
  - healthcare topic detection
  - career-goals topic resolution
  - medical cluster internal link builder

## Local smoke

All seven D11 smoke routes returned HTTP 200 on `http://localhost:3020` after build:

- medical guide: planning sections + healthcare card present
- career goals: healthcare card + career planning section present
- generic pages / texas / compare / loyola: no unexpected healthcare blocks

## Ready to commit

yes — pending approval; do not push without approval

Suggested commit:

```text
feat(seo): strengthen medical scholarship topic cluster
```
