# Stage 5E-4 scholarship_detail monitoring (2026-05-23)

## Scope

Read-only production checks after Stage 5E-3 (106 pilots, batches 6–10). **No new seeds.**

## Verdict

| Question | Answer |
|----------|--------|
| **Safe to continue batch 11?** | **yes** |
| **Recommended next batch size** | **10** (standard 10 scholarships / 20 rows) |
| **Overall monitoring** | **PASS** |

## Sitemap

| Check | Result |
|-------|--------|
| `/sitemap.xml` | HTTP **200** |
| Index lists ES detail-db | true |
| Index lists FR detail-db | true |
| ES detail-db URLs | **106** (expected 106) |
| FR detail-db URLs | **106** (expected 106) |
| `/en` in detail XML | false |
| draft/review in XML | false |

## Route sample (10 pilot slugs × ES/FR = 20 requests)

- Failures: **0**
- none

Sample slugs: climate-stripes-scholarship-14487, dollar-sense-scholarship-edelmanfinancialengines, beiling-wu-prize-in-writing-at-northwestern-university-2026-beiling-wu-prize-in-writing, ng-kai-wa-scholarship-at-singapore-management-university-2026-ng-kai-wa-scholarship, breakthrough-junior-challenge-breakthrough-junior-challenge, d-a-sprott-entrance-award-at-university-of-waterloo-2026-da-sprott-entrance-award-at-univ, margery-w-bain-franklin-scholarship-0wf0oqfbztbo, neachmm-student-scholarship-mf4k4nfoy3qm, international-bright-futures-scholarship-at-london-metropolitan-universi-london-metropolitan-university-i, st-joseph-class-of-1970-scholarship-shp7u6tqojhr

## Unseeded gate (5 slugs × ES/FR)

- Failures: **0**
- none

Slugs: how-to-apply-for-a-scholarship-step-by-step, fake-pilot-slug-not-in-allowlist-xyz, nonexistent-scholarship-detail-gate-test-99999, scholarship-application-guide-generic-404-test, fully-funded-masters-scholarship-unseeded-gate

## HTML sample (5 slugs × ES/FR)

| Path | OK | Notes |
|------|-----|-------|
| /es/scholarships/climate-stripes-scholarship-14487 | yes | canonical/hreflang/robots/overlay OK |
| /fr/scholarships/climate-stripes-scholarship-14487 | yes | canonical/hreflang/robots/overlay OK |
| /es/scholarships/uts-academic-excellence-international-scholarship-2026-postgraduate-academic-excellence | yes | canonical/hreflang/robots/overlay OK |
| /fr/scholarships/uts-academic-excellence-international-scholarship-2026-postgraduate-academic-excellence | yes | canonical/hreflang/robots/overlay OK |
| /es/scholarships/university-of-new-south-wales-unsw-international-scholarships-2026-in-australia | yes | canonical/hreflang/robots/overlay OK |
| /fr/scholarships/university-of-new-south-wales-unsw-international-scholarships-2026-in-australia | yes | canonical/hreflang/robots/overlay OK |
| /es/scholarships/mn-international-association-of-special-investigation-units-police-scien-p2qjquhseofe | yes | canonical/hreflang/robots/overlay OK |
| /fr/scholarships/mn-international-association-of-special-investigation-units-police-scien-p2qjquhseofe | yes | canonical/hreflang/robots/overlay OK |
| /es/scholarships/dimarco-graduate-scholarship-in-computational-rhetoric-at-university-of--dimarco-graduate-scholarship-in- | yes | canonical/hreflang/robots/overlay OK |
| /fr/scholarships/dimarco-graduate-scholarship-in-computational-rhetoric-at-university-of--dimarco-graduate-scholarship-in- | yes | canonical/hreflang/robots/overlay OK |

## English body fallback

- Hits: **0**
- none detected on HTML sample

## Category / resource / provider / IQ regression

- **PASS**
- all checks green

## Railway / Cloudflare logs (5xx spike)

**Not queried live in this run** (no API token in CI script). Manual check recommended:

- Cloudflare Analytics → Errors by path containing `/scholarships/`
- Railway deploy logs around Stage 5E-3 deploy window (`815633f`, `8973856`)

Prior traffic audit: `reports/cloudflare/scholarshiptop-traffic-audit-2026-05-21.md` — no scholarship-detail-specific spike documented pre-scale.

**Assumption for verdict:** no observed 5xx in route/HTML sample (0 HTTP anomalies).

## Blockers

- none

## Commands re-run

```bash
npx tsx scripts/seo/i18n-scholarship-detail-sitemap-verify.ts 106
$env:EXPECTED_DETAIL_SITEMAP='106'; npx tsx scripts/seo/i18n-stage5e-3-production-regression-smoke.ts
npx tsx scripts/seo/i18n-stage5e-4-scholarship-detail-monitoring.ts
```
