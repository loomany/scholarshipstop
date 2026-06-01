# D8 Preflight

Date: 2026-05-31

## Repository

- Actual repo path used: `C:\dev\scholarshipstop`
- Current HEAD: `2e92f67 feat(seo): add structured data for enriched pages`
- Customer package path exists: yes
- D7 reports exist: yes
  - `reports/data/d7-current-data-usage-summary.md`
  - `reports/data/d7-customer-data-reuse-master-matrix.csv`
  - `reports/data/d7-missed-quick-wins.md`
  - `reports/data/d7-source-to-page-opportunity-map.csv`
  - `reports/data/d7-max-data-reuse-roadmap.md`

## Preflight Commands

- `npm run data:validate-enrichment`: pass before D8 changes; existing Stage A warnings only
- `npm run seo:validate-jsonld`: pass
- `npx tsc --noEmit`: pass

## Dirty Tree Notes

The worktree already contained unrelated dirty/untracked files before D8. D8 does not revert or stage them.

Unrelated modified examples:

- `lib/i18n/homePageCopy.ts`
- `lib/i18n/scholarshipsFilterPanelsUiCopy.ts`
- `lib/i18n/scholarshipsMoreFiltersUiCopy.ts`
- `reports/seo/*`

Unrelated untracked examples:

- `.env.local.bak-stage4d`
- `.env.local.prod-backup`
- `data/content/*`
- `reports/seo/*`
- `supabase/migrations/20260527175533_harden_i18n_scholarship_worker_lock_rls.sql`

## Guardrails

- No Supabase schema/RLS/Auth/Payments work planned or performed
- No migrations planned or run
- No canonical/robots/noindex/sitemap policy changes planned or performed
- No raw customer package files copied into the repo
- No push performed
