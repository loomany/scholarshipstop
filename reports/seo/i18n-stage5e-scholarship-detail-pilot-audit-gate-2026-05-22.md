# Stage 5E — Scholarship detail pilot audit/gate — 2026-05-22

## Gate audit

| Item | Finding |
|------|---------|
| `source_type` | `scholarship_detail` |
| `source_id` | Scholarship **UUID** (`scholarships.id`), not slug — see `gateLocalizedScholarshipDetailOrNotFound(locale, scholarshipId)` |
| Route | `app/[locale]/scholarships/[[...slugPath]]` resolves slug → id, then calls gate |
| Without translation | `notFound()` via `shouldExposeTranslatedRoute` |
| With translation | Still `notFound()` — render stub at line 31 (`localizedScholarshipDetailGate.ts`) |
| English fallback | None on localized route |
| Sitemap | No `scholarship_detail` bucket until published + render |

## Pilot candidates (not seeded)

| Slug | Notes |
|------|-------|
| `climate-stripes-scholarship-14487` | User-reported; indexable EN detail |
| TBD 1–2 | Pick from sitemap/hub after stability review |

## Production write

**Not performed.** Render path must ship before any `content_translations` insert.

## Dry-run / CSV

No rows file — `reports/seo/i18n-stage5e-scholarship-detail-pilot-rows-2026-05-22.csv` not created.

## Safe next step

1. Add `LocalizedScholarshipDetailPage` (or extend client) consuming `getPublishedContentTranslation`.
2. Remove final `notFound()` in gate when translation present.
3. Add slug to `PUBLISHED_SCHOLARSHIP_DETAIL_SLUGS` in `detailLanguageSwitcher.ts` when published.
4. Manual ES/FR copy, max 1 scholarship × 2 locales, `quality_score >= 85`, smoke, then sitemap.
