# Stage 5E current 56 scholarship_detail QA (2026-05-23)

## Verdict: **PASS**

## DB (scholarship_detail)

```json
{
  "total": 112,
  "es": 56,
  "fr": 56,
  "published": 112,
  "statuses": {
    "published": 112
  },
  "quality_below_85": 0,
  "machine_models": {
    "stage5e-scholarship-manual-pilot": 2,
    "stage5e-scholarship-manual-pilot-2": 10,
    "stage5e-scholarship-manual-batch-1": 20,
    "stage5e-scholarship-manual-batch-2": 20,
    "stage5e-scholarship-manual-batch-3": 20,
    "stage5e-scholarship-manual-batch-4": 20,
    "stage5e-scholarship-manual-batch-5": 20
  }
}
```

## Sitemap

| Check | Result |
|-------|--------|
| ES URLs | 56 (expected 56) |
| FR URLs | 56 (expected 56) |
| index ES bucket | true |
| index FR bucket | true |
| /en in XML | false |
| draft/review | false |



## Route smoke (all 56 slugs × EN/ES/FR)

- Failures: **0**
- none

## Unseeded gate (3 slugs → 404 ES/FR)

- `how-to-apply-for-a-scholarship-step-by-step`
- `fake-pilot-slug-not-in-allowlist-xyz`
- `nonexistent-scholarship-detail-gate-test-99999`

## HTML spot-check (10 slugs × ES/FR)

- Failures: **0**
- none

Sample slugs: ifk-research-fellowships-at-international-research-center-for-cultural-s-ifk-research-fellowships, shirin-fozdar-scholarship-at-smu-2026-shirin-fozdar-scholarship, milestone-trial-lawher-scholarship-2026-2026-05-18-milestone-trial-lawhe, ng-kai-wa-scholarship-at-singapore-management-university-2026-ng-kai-wa-scholarship, jlfo-lim-hoon-foundation-scholarship-at-singapore-management-university--lim-hoon-foundation-scholarship, deoliveira-drs-daniel-anabell-maximize-your-potential-scholarship-endowm-deoliveira-drs-daniel-anabell-ma, de-suantio-bursary-at-singapore-management-university-2026-de-suantio-scholarship, china-university-of-petroleum-scholarship-1461, david-beltz-memorial-award-at-university-of-waterloo-2026-david-beltz-memorial-award-at-un, john-w-and-brigid-g-miller-law-school-scholarship-at-university-of-wisco-john-w-and-brigid-g-miller-law-s
