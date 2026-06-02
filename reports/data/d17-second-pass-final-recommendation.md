# D17 Second-Pass Final Recommendation

Date: 2026-06-01  
Audit: Customer package reuse after D1–D16  
Verdict: **PASS with warnings**

---

## 1. What we already extracted from the customer package

### Static JSON layer (11 files, ~10.58 MB)

| Wave | Outputs | Customer sources consumed |
|---|---|---|
| Stage A / D1–D6 baseline | school, state, city, crosswalk | Scorecard, OpenAlex, ROR, Census, HUD, MIT, BLS state, FBI, County Health (light), US Cities, GeoNames |
| D8 | provider_nonprofit, institution_research, state_social | ProPublica, NIH aggregates, CDC SVI, ADI aggregates |
| D9 | city_rent_metro | BLS metro, Zillow ZORI snapshot |
| D10 | medical_school, health_workforce, premed_topic | WDOMS, LCME, COCA, AACOM, admit.med aggregates, HRSA HPSA aggregate |

### Product surfaces using data (not just files)

- Compare state/university detail + hubs
- Scholarship state/university sidebars
- Provider school/nonprofit/research context
- Resource/essay contextual cards + D11 medical cluster
- D5 internal link graph, D6 JSON-LD, D13 GEO copy, D14 footer dedupe
- D16 sitemap fix for medical guide discovery

**Estimate:** ~65–70% of **safe general-site** customer-package value is captured. D7 Wave 1 quick wins are largely **closed**.

---

## 2. What remains useful (realistic)

| Category | Remaining upside |
|---|---|
| **Ops / GSC** | URL Inspection, Performance exports, query-led copy (blocked on GSC access) |
| **Provider match QA** | Foundations missing from ProPublica extract (Alamo = source gap) |
| **Content pages** | Nursing/pre-med guides using existing `premed_topic_context` |
| **Trust** | Methodology/data-sources page extension |
| **City vertical** | Data ready; needs route strategy |
| **USAspending / County Health deep** | Lower ROI; partial/risky |
| **Residency/hospital raw sources** | Vertical-only — do not use now |

---

## 3. What to do next (recommended 3–5 stages)

| Stage | Focus | Type |
|---|---|---|
| **D18 — GSC ops + copy feedback** | Grant GSC access; URL Inspection medical guide; title/meta from 7/28-day queries on career-goals, texas intl, medical guide | Ops + copy |
| **D19 — Medical cluster content** | Nursing guide (and optionally pre-med guide); methodology section extension | Content-only |
| **D20 — Provider data QA** | Top foundation provider inventory; ProPublica collect expansion proposal; manual EIN verification workflow | Data ops |
| **D21 — City strategy (optional)** | Approve city hub pilot; reuse `city_rent_metro` without new raw JSON | Product + SEO approval |
| **D22+ — Medical vertical** | Dedicated med-school routes only if search demand + editorial capacity | Major vertical |

**Best immediate next stage:** **D18 (GSC ops + query-led copy polish)** — zero new datasets, highest feedback loop value after D16.

---

## 4. What NOT to do

- Ship raw customer package files or NIH/HRSA JSONL to the site
- Auto-fuzzy-match ProPublica providers
- Add residency/FREIDA/NRMP/hospital quality to general pages
- Programmatic city pages without route/noindex/sitemap approval
- Change canonical/robots/noindex/sitemap policy as part of data reuse
- Supabase migrations for match overrides without explicit approval
- Commit `.env` or GSC credentials

---

## 5. What requires approval

| Item | Approver |
|---|---|
| New resource guides (nursing/pre-med) | Editorial + SEO |
| City/local route strategy | Product + SEO |
| ProPublica collect expansion | Data ops |
| Provider manual override JSON | Ops + engineering |
| New indexable methodology URL | SEO |
| GSC service account permission | Ops |
| Medical vertical routes | Product |

---

## 6. Maximum SEO/GEO effect (remaining)

1. **Index + monitor medical guide** (D16 done — now GSC loop)
2. **Nursing/pre-med cluster pages** (data ready, content gap)
3. **Query-driven title/meta** on pages with impressions
4. **Provider trust blocks** on high-traffic foundations (after manual QA / collect)
5. **Central methodology/trust page** (E-E-A-T, not volume SEO)

---

## 7. Warnings

- ProPublica coverage is **incomplete** for some real scholarship providers — not fixable by matcher tuning alone
- State scholarship pages remain **noindex** — data/copy helps UX/AI, not index volume
- Static JSON at 10.58 MB — stay under 15 MB cap; city vertical increases payload risk
- GSC API still **403** — automated feedback loop blocked

---

## D17 deliverables

| File | Purpose |
|---|---|
| `d17-preflight.md` | Stage 0 |
| `d17-current-enrichment-inventory.csv` | Stage 1 |
| `d17-d7-vs-implemented-gap-analysis.csv` | Stage 2 |
| `d17-remaining-source-buckets.md` | Stage 3 |
| `d17-provider-gap-audit.md` | Stage 4 |
| `d17-provider-manual-qa-candidates.csv` | Stage 4 |
| `d17-new-page-opportunities.md` | Stage 5 |
| `d17-methodology-page-plan.md` | Stage 6 |
| `d17-next-opportunity-ranking.csv` | Stage 7 |
| `d17-second-pass-final-recommendation.md` | Stage 8 |

## Code changes

**None**

## Commit / push

**None**
