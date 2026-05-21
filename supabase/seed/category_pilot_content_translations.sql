-- Stage 4C category pilot seed (22 rows). LOCAL/STAGING ONLY.
-- Apply migration 20260521120000_content_translations.sql first.
-- Prefer: I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/i18n/seed-category-pilot-translations.ts

-- Verification (run as anon after seed):
-- select count(*) from public.content_translations where source_type = 'scholarship_category' and status = 'published';
-- Expected: 22
