# D17 New Page Opportunity Audit

Date: 2026-06-01  
**Plan only** — no pages created in D17.

---

## Nursing — `/resources/nursing-scholarships-guide`

| Dimension | Assessment |
|---|---|
| Why useful | Strong search intent; `premed_topic_context` already has `nursing-scholarships` topic with links to `/scholarships/nursing` |
| Data ready | **Yes** — `health_workforce_context`, `premed_topic_context`, BLS/HRSA state aggregates |
| Risks | Overlap with medical guide; must avoid clinical/eligibility claims |
| Create now? | **After GSC shows nursing queries** or if medical guide gets traction first |
| SEO priority | **High** (8/10) — natural cluster extension |

**Recommendation:** Fork `medical-scholarships-guide` shell; link from medical cluster + nursing preset. Content-only + internal links — no new JSON.

---

## Pre-med — `/resources/pre-med-scholarships-guide`

| Dimension | Assessment |
|---|---|
| Why useful | Distinct intent from general medical guide; `pre-med-scholarships` topic exists in `premed_topic_context` |
| Data ready | **Yes** — medical_school aggregate counts, WDOMS/LCME context, career-goals links |
| Risks | Admissions-stats wording; keep planning-only copy |
| Create now? | **Medium priority** — medical guide partially covers today |
| SEO priority | **High** (7/10) |

**Recommendation:** Either expand medical guide sections **or** split pre-med guide if GSC queries justify separate URL.

---

## Healthcare — `/resources/healthcare-scholarships-guide`

| Dimension | Assessment |
|---|---|
| Why useful | Broader umbrella (nursing, allied health, public health) |
| Data ready | **Yes** — same D10/D11 stack |
| Risks | Cannibalization vs medical + nursing guides |
| Create now? | **No** — defer until nursing/pre-med split decision |
| SEO priority | **Medium** (6/10) |

**Recommendation:** Use as hub page only if cluster grows to 4+ guides; otherwise keep medical guide as hub.

---

## City / cost — `/scholarships/{state}/{city}` or city hubs

| Dimension | Assessment |
|---|---|
| Why useful | Local affordability + rent/wage planning for students |
| Data ready | **Yes** — `city_rent_metro` (2.7 MB), `city_affordability`, crosswalk |
| Risks | **High** — route explosion, noindex policy, sitemap scope, payload |
| Create now? | **No** — requires product + SEO strategy approval |
| SEO priority | **Medium-long term** (7/10 potential, 9/10 risk) |

**Recommendation:** Pilot 3–5 cities linked from state pages before programmatic city generation.

---

## Methodology — `/resources/scholarshiptop-data-methodology` or `/about/data-sources`

| Dimension | Assessment |
|---|---|
| Why useful | Central trust/transparency; consolidates per-block `DataSourceFooter` |
| Data ready | **N/A** — content from existing footer sources + MANIFEST |
| Risks | Low if reference-only language reused |
| Create now? | **Optional** — `/scholarship-verification-methodology` already exists |
| SEO priority | **Medium** (5/10 SEO, 8/10 trust/E-E-A-T) |

**Recommendation:** Extend existing methodology page or add lightweight data-sources section — see `d17-methodology-page-plan.md`.

---

## Priority ranking (new pages)

| Rank | Page | Effort | SEO value | Do now? |
|---:|---|---|---|---|
| 1 | Nursing scholarships guide | Medium | High | After GSC query check |
| 2 | Pre-med scholarships guide | Medium | High | Optional split from medical guide |
| 3 | Data methodology extension | Low | Medium (trust) | Content-only if approved |
| 4 | Healthcare umbrella guide | Medium | Medium | Defer |
| 5 | City/local pages | High | High but risky | Defer pending strategy |

---

## What NOT to create without vertical approval

- Medical school profile pages (`/medical-schools/{slug}`)
- Residency/program directories
- Hospital/VA provider cluster pages
