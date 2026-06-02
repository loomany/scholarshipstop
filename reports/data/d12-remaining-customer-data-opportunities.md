# D12 Remaining Customer Data Opportunities

Date: 2026-06-01  
Based on: D7 usage summary, D8–D10 build reports, D12 static layer audit

## Use Next (safe, high ROI)

| Opportunity | Why | Suggested surface |
|---|---|---|
| **ProPublica nonprofit gaps** | D8 file exists (1,293 rows) but foundations like Alamo still unmatched | `/providers/[id]` — improve name/EIN matching workflow |
| **State scholarship copy polish** | Data already on state pages; GEO summaries weak vs data depth | `/scholarships/[state]` — visible planning summary blocks (copy only) |
| **Medical guide UI polish** | Strongest cluster center; planning sections dense | `/resources/medical-scholarships-guide` — above-fold summary + clearer CTA hierarchy |
| **Career goals visible summary** | Topic card + section live; could lead with one-line planning takeaway | `/essays/career-goals` |
| **Source/methodology hub page** | Footers exist per block; no central page | New static `/scholarship-data-methodology` (content-only, if approved) |
| **NIH aggregate expansion** | D8 has institution research; medical schools partially covered | Medical guide + university compare — more schools with research signal |

## Use Later (needs strategy or aggregation)

| Opportunity | Blocker | Notes |
|---|---|---|
| **City scholarship pages** | Route strategy not approved | D9 city rent/metro data ready for university compare; city pages need product decision |
| **Nursing scholarship guide** | No dedicated guide page | `premed_topic_context` has nursing topics; `/scholarships/nursing` preset only |
| **Pre-med scholarship guide** | Content page not created | D10 data exists; could fork from medical guide pattern |
| **BLS metro on scholarship sidebars** | UX scope | D9 metro wage already on university compare |
| **Zillow trend narrative** | Copy/legal review | Latest rent in D9; trend text needs careful wording |
| **USAspending funding context** | Partial coverage + scope | Useful for provider/research pages with clear partial-data copy |
| **CDC SVI / ADI deeper metrics** | Already aggregated in D8 | Expand only with neutral framing review |

## Only for Medical / Residency Vertical

Do not expose on general ScholarshipTop without vertical launch:

- FREIDA, NRMP, ACGME, MedMap, ResidencyAdvisor
- Board pass rates, fellowship directories
- CMS hospital quality, NPPES, Open Payments
- VA facility list (provider/medical cluster)
- Raw HRSA row-level HPSA (state aggregate only today)
- Raw admit.med tables (strict aggregate matches only today)

## Do Not Use on Current General Site

| Source | Reason |
|---|---|
| Residency program directories | Wrong product vertical |
| Hospital quality datasets | Clinical claims risk |
| Block-level ADI rows | Too granular; privacy/interpretation risk |
| Raw NIH project abstracts | Size + relevance noise |
| Full BLS occupation tables | Payload; use aggregates only |
| Full Zillow monthly series | Ship latest snapshot only (D9 pattern) |

## Needs Approval / Manual Source

| Item | Status |
|---|---|
| Blocked/manual customer package sources (per D7 matrix) | Await export/legal clearance |
| New city route strategy | Product/SEO approval before pages |
| Nursing/pre-med standalone guides | Content + editorial approval |
| Provider manual override workflow | Ops process, not data pipeline |
| Search Console feedback loop | Access + reporting cadence |

## Already Closed Since D7

These were “unused” in D7 but are now live:

- ProPublica nonprofit (D8) — partial provider coverage
- CDC SVI / ADI state aggregates (D8)
- NIH RePORTER institution aggregates (D8)
- BLS metro + Zillow ZORI (D9)
- WDOMS/LCME/COCA/AACOM/admit.med/HRSA (D10)

## Verdict

Customer package reuse is **~60% of safe general-site value captured**. Remaining upside is mostly **vertical expansion**, **provider match quality**, and **copy/UX polish** — not new raw datasets.
