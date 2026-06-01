# D9 City / Rent / Metro Preflight

Generated at: 2026-06-01

## Baseline

- Current HEAD: `120ba5c025db3982d9b6fe58113723897964f6be`
- D8 deployed commit: `120ba5c feat(data): add static enrichment v2 contexts`
- Customer package path exists: yes, `C:\dev\adek\customer_package\medresidency_data_package_2026-05-29`
- Planned Supabase/Auth/Payments changes: none
- Planned migrations: none
- Planned canonical/robots/noindex/sitemap policy changes: none
- Raw customer package files copied into repo: no

## Preflight Commands

- `git log --oneline -15`: PASS
- `git status --short`: PASS with pre-existing dirty/untracked unrelated files
- `npm run data:validate-enrichment`: PASS
- `npm run seo:validate-jsonld`: PASS
- `npx tsc --noEmit`: PASS

## Dirty Unrelated Files

The worktree already contained a large unrelated dirty set before D9 work started.
D9 will not stage, revert, or edit those files.

- Total dirty/untracked status lines at preflight: 702
- Modified `lib/i18n/*`: 3
- Modified `reports/seo/*`: 5
- Untracked `.env*`: 2
- Untracked `data/content/*`: 11
- Untracked `reports/seo/*`: 628
- Untracked `supabase/*`: 1

Representative unrelated paths observed:

- `lib/i18n/homePageCopy.ts`
- `lib/i18n/scholarshipsFilterPanelsUiCopy.ts`
- `lib/i18n/scholarshipsMoreFiltersUiCopy.ts`
- `reports/seo/*`
- `.env.local.bak-stage4d`
- `.env.local.prod-backup`
- `data/content/*`
- `supabase/migrations/20260527175533_harden_i18n_scholarship_worker_lock_rls.sql`

## Scope Guard

D9 will only create or edit scoped city/rent/metro enrichment files, loaders,
minimal UI components, validation, and `reports/data/d9-*` reports.
