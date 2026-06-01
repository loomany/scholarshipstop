# D11 Next Medical Vertical Plan

Date: 2026-06-01

## Should ScholarshipTop launch a separate medical/nursing/pre-med vertical?

**Not yet as a standalone product vertical.** The current inventory is small but coherent enough to strengthen inside the existing ScholarshipTop content cluster:

- one dedicated medical guide
- one career-goals essay hub tie-in
- one medicine category listing
- one nursing long-tail preset

A separate vertical would add SEO/policy surface area before there is enough curated page inventory to justify it.

## Safe URLs to extend next (with approval)

| URL / pattern | Safe extension |
|---|---|
| `/resources/medical-scholarships-guide` | More curated planning sections, not new index pages |
| `/essays/career-goals` | Healthcare planning copy + links only |
| `/scholarships/category/medical` | Compact planning card + link back to guide |
| `/scholarships/nursing` | Health workforce card only when state is explicit |
| `/providers/[slug]` | Medical school card only on strict identity match |
| State scholarship routes with explicit state | `HealthWorkforceContextBlock` when state code is unambiguous |

## Sources safe to use

- D10 outputs already approved:
  - `premed_topic_context.json`
  - `medical_school_enrichment.json`
  - `health_workforce_context.json`
- Existing ScholarshipTop enrichment:
  - College Scorecard
  - state affordability
  - city rent/metro
  - institution research aggregate
  - OpenAlex / NIH aggregate where already used

## Sources not to use on general ScholarshipTop

- FREIDA
- NRMP
- ACGME
- MedMap
- ResidencyAdvisor
- board pass rates
- CMS hospital quality raw
- NPPES raw
- Open Payments raw
- residency/program-only datasets

## Requires separate approval

- New standalone pages such as `/resources/nursing-scholarships-guide`
- Category-wide automatic medical cards on all provider pages
- State workforce cards on generic national pages without explicit state signal
- Any schema expansion beyond Article / FAQPage / BreadcrumbList
- Any change to canonical / robots / sitemap / noindex policy
- Any Supabase / Auth / Payments work

## Recommendation

Proceed with D11 cluster strengthening first, then reassess after post-deploy smoke. If traffic and content inventory grow, the next approved step is a **nursing guide shell** plus state-qualified workforce cards — not a full medical vertical fork.
