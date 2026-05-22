# Stage 5E-1 — Scholarship detail pilot (climate-stripes) — 2026-05-22

## Browser QA (pre-5E deploy — switcher fix)

| Check | Result |
|-------|--------|
| `/scholarships/climate-stripes-scholarship-14487` | 200 |
| Header language control | Client dropdown (not in static HTML); `Language` / `English` present in document |
| `/en` href | Not found |
| `/es` + `/fr` same slug (before 5E) | 404 |

## Browser QA (post-`f3f1f13` + DB seed)

| Check | Result |
|-------|--------|
| EN detail | 200 |
| ES detail | 200 — Spanish overview copy in HTML (`Esta página resume…`) |
| FR detail | 200 — smoke passed |
| Unseeded ES detail | 404 |
| `/en` | 404 |

## Mapping decision

| Field | Value |
|-------|--------|
| `source_type` | `scholarship_detail` |
| `source_id` | `99145773-6fc4-41c7-95a3-dcaafde5637b` (scholarships.id UUID) |
| URL slug | `climate-stripes-scholarship-14487` (unchanged EN slug under `/es` and `/fr`) |
| Gate | `fetchPublishedScholarshipDetail` → published row + quality ≥ 85 + body/summary |
| Render | `applyScholarshipDetailTranslation` overlays `seoOverview`, summaries, FAQ; **keeps** `title`, amount, deadline, provider |

## Files changed (commit `f3f1f13`)

- `lib/i18n/scholarshipPilot/*` — gate, resolve, alternates, seed data, sitemap list
- `lib/i18n/localizedScholarshipDetailGate.ts` — returns translation row (no terminal `notFound()`)
- `app/scholarships/scholarshipsSlugPathPageBody.tsx` — localized fetch + merged scholarship
- `app/[locale]/scholarships/[[...slugPath]]/page.tsx` — metadata, hreflang, robots
- `lib/i18n/detailLanguageSwitcher.ts` — pilot slug → en/es/fr cluster
- `lib/seo/sitemaps.ts` — `locale-{es,fr}-scholarships-detail-db` buckets
- `scripts/i18n/seed-scholarship-detail-pilot-translations.ts`
- `scripts/seo/i18n-stage5e-scholarship-detail-pilot-smoke.ts`
- Tests: `scholarshipDetailPilot.test.ts`, updated `detailLanguageSwitcher.test.ts`

## Dry-run

```
Planned 2 rows | source_id=99145773-6fc4-41c7-95a3-dcaafde5637b | quality_score=90
machine_model=stage5e-scholarship-manual-pilot
```

CSV: `reports/seo/i18n-stage5e-scholarship-detail-pilot-rows-2026-05-22.csv`

## Production seed

| Metric | Value |
|--------|--------|
| Rows upserted | 2 (ES + FR) |
| `scholarship_detail` before → after | 0 → 2 |
| `machine_model` | `stage5e-scholarship-manual-pilot` |
| OpenAI | Not used |

## Smoke (`https://scholarshiptop.com`)

| Check | Result |
|-------|--------|
| EN switcher en/es/fr | OK |
| Programmatic ES/FR translation | OK |
| EN/ES/FR pilot HTTP 200 | OK |
| Unseeded ES 404 | OK |
| `/en` 404 | OK |
| English body leak heuristic on ES/FR | OK |

## SEO

- **Canonical:** per-locale via `buildScholarshipDetailAlternates` (EN default x-default when cluster complete)
- **hreflang:** en / es / fr / x-default when EN indexable + both translations published
- **robots:** index,follow on ES/FR when `shouldIndexTranslatedContent` passes (quality ≥ 85, localized body)
- **Sitemap:** `locale-es-scholarships-detail-db` and `locale-fr-scholarships-detail-db` (1 URL each after publish)

## Rollback SQL

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-manual-pilot';
```

## Verdict

| Question | Answer |
|----------|--------|
| **Accepted** | **Yes** — render + 2 published rows + production smoke green |
| **Ready for next 5 scholarships** | **Yes, with same pattern** — extend `SCHOLARSHIP_DETAIL_PILOT_SLUGS`, translation data module, manual review, dry-run cap, then seed |

## Live URLs

- https://scholarshiptop.com/scholarships/climate-stripes-scholarship-14487
- https://scholarshiptop.com/es/scholarships/climate-stripes-scholarship-14487
- https://scholarshiptop.com/fr/scholarships/climate-stripes-scholarship-14487

## Build / tests

| Gate | Result |
|------|--------|
| `npm run build` | Pass |
| `npx tsc --noEmit` | Pass |
| `npx tsx --test lib/i18n/__tests__/*.test.ts` | 90 pass |
| Stage 5E smoke | Pass (post-deploy) |
