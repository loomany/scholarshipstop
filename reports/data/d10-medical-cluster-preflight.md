# D10 Medical Cluster Preflight

Date: 2026-06-01
Repo: `C:\dev\scholarshipstop`
Customer package: `C:\dev\adek\customer_package\medresidency_data_package_2026-05-29`

## Current Git State

- Current HEAD: `d2a455f feat(data): add city rent and metro context`
- D9 deployed commit: `d2a455f`
- Customer package exists: yes
- Alternate repo path `C:\dev\scholarshiptop`: not used in this run

## Preflight Checks

- `npm run data:validate-enrichment`: PASS
- `npm run seo:validate-jsonld`: PASS
- `npx tsc --noEmit`: PASS

## Existing Dirty / Untracked Files

The worktree already contains unrelated dirty and untracked files. D10 will not
stage or modify these unless they are directly part of the D10 allowed scope.

- Modified `lib/i18n/*`: 3 files
- Modified `reports/seo/*`: 5 files
- Untracked `.env*`: 2 files
- Untracked `data/content/*`: multiple article/content files
- Untracked `reports/seo/*`: many prior SEO/autopilot reports
- Untracked `supabase/migrations/*`: 1 file
- Untracked `reports/data/d9-post-deploy-smoke-result.md`: D9 post-deploy smoke report created after the D9 push

## Guardrails

- No Supabase/Auth/Payments/RLS changes planned
- No migrations planned
- No canonical/robots/noindex/sitemap policy changes planned
- No raw customer package files will be copied into the repo
- No residency-only or hospital-quality data will be added to general ScholarshipTop UI
- D10 will use only small aggregate/static outputs and conservative server-only loaders
