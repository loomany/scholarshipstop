# ChatGPT handoff — i18n 7-hour DB scale-up (2026-05-22)

Copy everything below the line.

---

**Done:** Pushed 4 commits to `main` (`7bd9fe3`–`809e613`): scholarship detail +5 (10 DB rows), provider +2 (4 rows), essay detail pilot (6 rows + `/es|fr/essays/[slug]` gates), compare pilot (8 rows + `/es|fr/compare/{universities|states}/[slug]` gates). Production seeded 28 new `content_translations` rows. Post-deploy smoke script all green. OpenAI $0.

**Pushed:** `7bd9fe3`, `5bbe6d5`, `ef71a1e`, `809e613`, `2760ff5` (docs), `404ba41` (scholarship detail-db sitemap fix).

**Not pushed:** IQ 5C-5 code (inventory report only).

**DB writes:** scholarship_detail +10, provider_profile +4, essay_guide +6, compare_university +4, compare_state +4 (28 total).

**OpenAI:** $0.

**Live examples:** `/es/scholarships/china-university-of-petroleum-scholarship-1461`, `/es/providers/princeton-university`, `/es/essays/how-to-write-about-the-gap-between-expectation-and-reality-of-studying-in-america`, `/es/compare/states/california-vs-texas`.

**404 gates:** ES/FR scholarship/essay/compare detail without published pilot translation.

**Gates:** build OK, tsc OK, 91 i18n tests OK, `scripts/seo/i18n-7hour-scaleup-production-smoke.ts` OK post-deploy.

**Sitemap/hreflang:** ES/FR pilot URLs in sitemap; hreflang en/es/fr/x-default; no `/en`.

**Sitemap fix (404ba41, post-deploy verified):** `/sitemap.xml` now lists `locale-es-scholarships-detail-db` and `locale-fr-scholarships-detail-db`. Both XML endpoints **200**. Each contains **6** pilot scholarship URLs (12 total ES+FR). `/sitemaps/scholarships-0.xml` still **200**. No `/en/` or draft/review strings in detail-db sitemaps. Root cause was anon RLS on `scholarships` join; fixed with service-role slug lookup.

**Rollback:**

```sql
delete from public.content_translations where source_type='scholarship_detail' and locale in ('es','fr') and machine_model='stage5e-scholarship-manual-pilot-2';
delete from public.content_translations where source_type='provider_profile' and locale in ('es','fr') and machine_model='stage5d-provider-manual-pilot-2';
delete from public.content_translations where source_type='essay_guide' and locale in ('es','fr') and machine_model='stage5f-essay-manual-pilot';
delete from public.content_translations where source_type in ('compare_university','compare_state') and locale in ('es','fr') and machine_model in ('stage5g-compare-university-manual-pilot','stage5g-compare-state-manual-pilot');
```

**Issues:** Compare/essay ES/FR are summary overlays, not full EN article body. IQ 5C-5 still pending.

**Next:** Stage 5H — another small batch (+5 scholarships or +3 essays), same caps and smoke.

**Scale safe?** Yes, same pilot discipline.
