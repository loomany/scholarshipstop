# i18n 7-hour DB scale-up — master report (2026-05-22)

## Summary

Extended ES/FR DB translation pilots across scholarship detail (+5), provider profile (+2), new essay detail routes (3), and new compare detail routes (4 pages). All changes pushed to `main` (`7bd9fe3` … `809e613`). Production smoke green after deploy (~3 min).

## DB writes (production)

| source_type | new rows this session | machine_model(s) |
|-------------|----------------------:|------------------|
| scholarship_detail | 10 | stage5e-scholarship-manual-pilot-2 |
| provider_profile | 4 | stage5d-provider-manual-pilot-2 |
| essay_guide | 6 | stage5f-essay-manual-pilot |
| compare_university | 4 | stage5g-compare-university-manual-pilot |
| compare_state | 4 | stage5g-compare-state-manual-pilot |
| **Total new** | **28** | |

Cumulative published ES+FR rows (approx.): category 22, resources 50, providers 10, scholarships 12, essays 6, compare 8.

## Pushed commits

1. `7bd9fe3` — scholarship +5 pilot
2. `5bbe6d5` — provider +2 pilot
3. `ef71a1e` — essay detail pilot (routes + seed)
4. `809e613` — compare detail pilot (routes + seed + sitemap/switcher)

Prior session baseline: `f3f1f13`, `059142f` (5E-1 climate-stripes).

## Not pushed / deferred

- IQ 5C-5 remaining surfaces (report only: `i18n-stage5c-5-iq-final-remaining-cleanup-2026-05-22.md`)
- Bulk translation, schema changes, `/en`, new languages

## OpenAI

**$0**

## New live URL patterns (examples)

- `/es/scholarships/china-university-of-petroleum-scholarship-1461`
- `/fr/providers/princeton-university`
- `/es/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america`
- `/fr/compare/states/california-vs-texas`

## New 404 gates

- ES/FR scholarship detail not in pilot allowlist + no published row
- ES/FR essay CMS slug without published `essay_guide` row
- ES/FR compare university/state slug without published row

## Build / tests / smoke

| Check | Result |
|-------|--------|
| build | pass |
| tsc | pass |
| i18n unit tests | 91/91 |
| `i18n-7hour-scaleup-production-smoke.ts` (post-deploy) | all pass |

## Sitemap / hreflang

- New ES/FR sitemap buckets: essays guide DB, compare detail DB
- hreflang only for published translations; no `/en`
- English root URLs canonical

## Rollback SQL (session batches)

See phase reports for full SQL per `machine_model`.

## Remaining issues

- Compare ES/FR pages are pilot summaries only (not full EN comparison tables)
- Essay ES/FR pages use localized overlay; EN CMS HTML not shown on ES/FR
- IQ product copy gaps (5C-5) still open

## Next recommended stage

**5H** — +5 scholarships OR +3 essays with monitoring; keep batch caps; run post-deploy smoke script after each push.

## Safe to scale next batch?

**Yes**, with same guards: ≤10 rows per type per phase, manual review, dry-run, production flags, no English fallback, post-deploy smoke.
