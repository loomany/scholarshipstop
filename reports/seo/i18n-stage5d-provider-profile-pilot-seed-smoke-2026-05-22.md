# Stage 5D-2 — Provider profile pilot seed (3 × ES/FR)

Date: 2026-05-22  
Gate commit: `0532d99`  
Seed: 6 `provider_profile` rows (`machine_model=stage5d-provider-manual-pilot`)

## Slug note (Harvard)

Production canonical slug is **`harvard-university`**, not `harvard`.  
`/providers/harvard` and `/es/providers/harvard` return **404** (by design; no alias).  
Task item “harvard” maps to `harvard-university` in DB and URLs.

## 1. Pre-seed DB state (read-only)

| Metric | Value |
|--------|-------|
| `provider_profile` rows | **0** |
| `scholarship_category` rows | 22 (unchanged) |
| `resource_article` rows | 50 (unchanged) |
| RLS anon non-published visible | **0** (PASS) |
| `/providers/loyola-university-chicago` | 200 |
| `/providers/harvard-university` | 200 |
| `/providers/university-of-michigan` | 200 |
| `/es/providers/loyola-university-chicago` | 404 (expected) |

## 2. Dry-run result

```
Planned 6 provider_profile rows (stage cap 6)
3 UUIDs: loyola, harvard-university, university-of-michigan
3 ES + 3 FR
status=published quality_score=90
No DB writes
```

## 3. Seed result

```
upserted: 6
provider_profile before: 0 → after: 6
scholarship_category: 22 (unchanged)
resource_article: 50 (unchanged)
machine_model: stage5d-provider-manual-pilot
No OpenAI
```

## 4. Post-seed row counts

| Check | Result |
|-------|--------|
| Total `provider_profile` | 6 |
| ES | 3 |
| FR | 3 |
| All `published` | yes |
| All `quality_score` ≥ 85 | 90 |
| Extra provider rows | 0 |
| `source_id` = provider UUIDs | yes |
| Anon sees 6 published provider rows | yes |
| RLS published-only | PASS |

## 5. Provider URLs checked (production)

| URL | Status |
|-----|--------|
| `/providers/loyola-university-chicago` | 200 |
| `/providers/harvard-university` | 200 |
| `/providers/university-of-michigan` | 200 |
| `/es/providers/loyola-university-chicago` | 200 |
| `/fr/providers/loyola-university-chicago` | 200 |
| `/es/providers/harvard-university` | 200 |
| `/fr/providers/harvard-university` | 200 |
| `/es/providers/university-of-michigan` | 200 |
| `/fr/providers/university-of-michigan` | 200 |
| `/es/providers/stanford-university` | 404 |
| `/fr/providers/stanford-university` | 404 |
| `/providers/harvard` | 404 (no slug alias) |

## 6. Sitemap result

| Sitemap | Loc count |
|---------|-----------|
| `locale-es-providers-db.xml` | **3** |
| `locale-fr-providers-db.xml` | **3** |
| `locale-es-resources-db.xml` | 25 (unchanged) |
| No `/en` in provider sitemap URLs | verified |

## 7. hreflang / canonical / robots (ES Loyola sample)

- Self canonical: `/es/providers/loyola-university-chicago` — OK  
- hreflang: `en`, `es`, `fr`, `x-default` — OK  
- robots: index/follow — OK  
- Legal name `Loyola University Chicago` in H1 — preserved  
- Localized Spanish body (e.g. Bellas Artes copy) — OK, no English about fallback  
- No `/en` links on page — OK  

## 8. Regression checks

| Check | Result |
|-------|--------|
| `/es/providers`, `/fr/providers` | 200 |
| Category stem ES/FR | 200 |
| Category hobbies ES/FR | 404 |
| Resource pilot ES/FR | 200 |
| ES scholarship detail without translation | 404 |
| `/en` | 404 |

## 9. Rollback SQL (do not run unless smoke fails badly)

```sql
delete from public.content_translations
where source_type = 'provider_profile'
  and locale in ('es', 'fr')
  and machine_model = 'stage5d-provider-manual-pilot';
```

## 10. Code changes (for seed + verification)

- `lib/i18n/providerPilot/providerPilotTranslationsData.ts` — manual ES/FR copy  
- `lib/i18n/providerPilot/providerPilotSlugs.ts` — 3 slugs, cap 6  
- `scripts/i18n/seed-provider-pilot-translations.ts` — safe upsert  
- `scripts/seo/i18n-stage5d-pre-seed-db-verify.ts`  
- `scripts/seo/i18n-stage5d-post-seed-db-verify.ts`  
- `scripts/seo/i18n-stage5d-provider-route-gate-smoke.ts` — seeded mode  

## 11. Final verdict

| Question | Answer |
|----------|--------|
| Provider pilot accepted? | **yes** |
| Ready for +2 providers? | **yes** (after QA on these 3; max 4 more rows to stay ≤10 pilot cap) |
| Ready for essay/compare pilot? | **yes** (independent surface; no essay/compare rows touched) |
