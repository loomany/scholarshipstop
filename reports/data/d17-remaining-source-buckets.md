# D17 Remaining Source Buckets

Date: 2026-06-01  
Customer package: read-only (`medresidency_data_package_2026-05-29`)  
Site static layer: 11 JSON files (~10.58 MB)

D7 matrix baseline: **11 sources marked live** at D7 time; **~100 marked not live**. After D8–D16, most D7 Wave 1 safe extensions are **implemented**. Remaining value is mostly **match quality**, **content pages**, **ops/GSC**, and **future verticals**.

---

## Use now safely

Sources already aggregated into static JSON; further work is copy/UX/match QA, not new raw shipping:

| Source | Static output | Notes |
|---|---|---|
| College Scorecard | `school_enrichment`, `city_affordability` | Mature; refine source-year lines |
| Census ACS, HUD FMR, MIT, BLS state | `state_affordability` | Live on compare/state/uni |
| FBI crime (state aggregate) | `state_affordability` | Neutral wording only |
| OpenAlex / ROR | `school_enrichment`, `institution_research` | Friendly metrics live |
| NIH RePORTER (aggregates) | `institution_research` | Never ship raw projects |
| ProPublica (matched subset) | `provider_nonprofit` | Strict matching only |
| CDC SVI / ADI (state aggregates) | `state_social_context` | D8 closed D7 gap |
| BLS metro + Zillow latest | `city_rent_metro` | D9 closed D7 gap |
| WDOMS/LCME/COCA/AACOM/admit.med (aggregates) | `medical_school` | Medical guide only |
| HRSA HPSA (state aggregate) | `health_workforce` | No row-level HPSA |
| GeoNames / US Cities | `location_crosswalk`, `city_affordability` | Join layer |

**Safe next actions:** GSC URL Inspection on medical guide, title/meta polish from queries, provider manual QA sheet.

---

## Use with manual QA

| Source / action | Why QA | Example |
|---|---|---|
| ProPublica unmatched foundations | Name/state/EIN ambiguity or **missing from package** | Alamo Colleges Foundation — **not found** in package `propublica_nonprofit.jsonl` or site static JSON |
| Provider alias overrides | Avoid fuzzy auto-match | Ops-reviewed alias → EIN map (approval required before any JSON) |
| County Health deeper metrics | Interpretation risk | Pick neutral measures + legal copy review |
| Zillow trend narrative | Market wording sensitivity | Latest rent OK; trend sentences need editorial pass |
| USAspending THCGME slice | Partial coverage | Label clearly if ever added |

---

## Use only if new pages exist

| Source | Waiting on | Data ready? |
|---|---|---|
| BLS metro / Zillow / city crosswalk | City hub or `/scholarships/{state}/{city}` strategy | **Yes** (`city_rent_metro`) |
| CDC SVI / ADI county | City/local pages | Partial (state aggregate live) |
| FBI city/county | City pages | **No** (state only today) |
| Nursing / pre-med topic rows | Dedicated resource guides | **Yes** (`premed_topic_context`) |
| Medical school directory rows | `/medical-schools/{slug}` vertical | **Yes** (`medical_school_enrichment`) |

---

## Future medical / pre-med / nursing vertical

Use **only** with vertical launch — not on general scholarship UX today:

| Source | Rows (package) | Status on site |
|---|---:|---|
| WDOMS / LCME / COCA / AACOM | 73–321 | **Aggregated** in medical guide context |
| admit.med school stats | 709 | **Aggregate** in medical_school_enrichment |
| HRSA HPSA raw | 163k | **Not shipped** — state aggregate only |
| FREIDA, NRMP, ResidencyAdvisor, ACGME | 11k–28k each | **Not used** — residency-only |
| Board pass / fellowship dirs | various | **Not used** |

---

## Future city / local vertical

| Source | Notes |
|---|---|
| `city_rent_metro_enrichment.json` (2.7 MB) | Built; consumed on university compare, not city URLs |
| `city_affordability.json` | Join + sidebar support |
| `location_crosswalk.json` | GeoNames aliases for matching |
| Zillow full monthly series | **Do not ship** — latest snapshot pattern only |

**Blocker:** route/SEO strategy approval, not data pipeline.

---

## Do not use on current general site

| Source | Reason |
|---|---|
| FREIDA / NRMP / residency program dirs | Wrong product vertical |
| CMS hospital quality / NPPES / Open Payments | Clinical/provider claims risk |
| Block-level ADI rows | Granularity + interpretation risk |
| Raw NIH project abstracts / JSONL | Size + noise |
| Full BLS occupation tables | Payload; aggregates only |
| Full Zillow monthly wide series | Ship snapshot only (D9 pattern) |
| FBI city rankings | Safety ranking language risk |
| VA facility list as general provider enrichment | Medical cluster only, future |

---

## Blocked / manual / access needed

| Item | Status |
|---|---|
| GSC Search Analytics API | **403** — service account needs property permission (D15/D16) |
| USAspending full API | Partial THCGME local slice only |
| Blocked/manual sources in D7 matrix | Await export/legal clearance per matrix notes |
| ProPublica collect expansion | May need new collect run for missing foundations |

---

## Downstream only

Ignore as parser/computed concepts in D7 matrix:

- HRSA Workforce Projections (computed)
- ProPublica Dollars for Docs (downstream)
- Aggregate NIH funding tier concepts
- Various `OUT_OF_SCOPE_AGGREGATE` rows

---

## Summary

**~65–70% of safe general-site customer-package value is captured** (up from D12 ~60% estimate). Remaining upside is **not** primarily “ship more raw JSON” — it is **provider match QA**, **new indexable content pages**, **GSC feedback**, and **optional city/medical verticals**.
