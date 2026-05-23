# Stage 5E scholarship detail batch 11 — seed & smoke (2026-05-23)

- machine_model: `stage5e-scholarship-manual-batch-11`
- Expected cumulative sitemap URLs per locale: **116**
- OpenAI: **$0** (deterministic overlay)
- DB rows upserted: **20** (10 scholarships × ES/FR)

## Route smoke (batch slugs)

| slug | EN | ES | FR |
|------|----|----|-----|
| `science-technology-undergraduate-scholarship-at-…` | 200 | 200 | 200 |
| `global-impact-scholarship-at-stevens-institute-o…` | 200 | 200 | 200 |
| `amsterdam-merit-scholarship-ams-2026-amsterdam-m…` | 200 | 200 | 200 |
| `university-of-surrey-discounts-for-surrey-gradua…` | 200 | 200 | 200 |
| `rmit-study-support-scholarship-2026-rmit-study-s…` | 200 | 200 | 200 |
| `dr-gloria-hill-book-award-endowed-at-lewis-unive…` | 200 | 200 | 200 |
| `dcu-merit-scholarship-2026-dcu-merit-scholarship…` | 200 | 200 | 200 |
| `university-of-central-lancashire-women-in-stem-b…` | 200 | 200 | 200 |
| `conference-travel-grants-at-university-of-califo…` | 200 | 200 | 200 |
| `transfer-g2k-scholarship-in-arts-sciences-at-uni…` | 200 | 200 | 200 |

## Unseeded gate

- `how-to-apply-for-a-scholarship-step-by-step`: ES=404 FR=404 OK
- `fake-pilot-slug-not-in-allowlist-xyz`: ES=404 FR=404 OK

## Sitemap

- ES URLs: **116** (expect >= 116)
- FR URLs: **116** (expect >= 116)
- No `/en`, no draft/review in detail-db XML

## HTML spot-check (3 slugs × ES/FR)

- `science-technology-undergraduate-scholarship-at-smu-2026-science-technology-undergraduate` — ES/FR OK (canonical, hreflang, robots, overlay)
- `amsterdam-merit-scholarship-ams-2026-amsterdam-merit-scholarship-ams` — ES/FR OK
- `dcu-merit-scholarship-2026-dcu-merit-scholarship` — ES/FR OK
- English body fallback: **not detected** on sample

## Regression

- category / resource / provider / IQ — **PASS** (`EXPECTED_DETAIL_SITEMAP=116`)
- `/sitemap.xml` — 200

## Rollback

```sql
delete from public.content_translations
where source_type = 'scholarship_detail'
  and locale in ('es', 'fr')
  and machine_model = 'stage5e-scholarship-manual-batch-11';
```

## Final verdict

| Question | Answer |
|----------|--------|
| **Batch 11 accepted?** | **yes** |
| **Safe to continue batch 12?** | **yes** (after optional 24h monitor; same gates) |

## Totals after batch 11

- **116** pilot slugs
- **232** `scholarship_detail` rows (ES+FR)
- **116+116** detail-db sitemap URLs

## Deploy

- Code: `1568b42`
