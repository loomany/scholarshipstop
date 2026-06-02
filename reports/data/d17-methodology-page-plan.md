# D17 Methodology Page Plan

Date: 2026-06-01

## Current state

| Asset | Status |
|---|---|
| Per-block `DataSourceFooter` | Live on enriched compare/provider/scholarship/medical pages |
| `/scholarship-verification-methodology` | **Exists** — linked from provider pages |
| Central "data sources" hub | **Not dedicated** — footers are distributed |
| `Dataset` / `DataCatalog` JSON-LD | **Not implemented** (D6/D7 policy) |

## Gap

Users and crawlers see **reference-only footers** on individual pages but no single page explaining:

- Where public datasets come from
- What "reference only" means
- That data is **not** eligibility rules or guarantees
- Why some pages show no external context (strict matching)
- Update cadence and aggregation approach

## Options

### Option A — Extend `/scholarship-verification-methodology`

**Pros:** No new route; already linked; low risk  
**Cons:** Page name emphasizes verification not data sources

Add sections:

1. Public datasets used (list from MANIFEST — human-readable names only)
2. Aggregation policy (no raw dumps, no block-level ADI, etc.)
3. Matching policy (strict school/nonprofit/medical keys)
4. Missing data explanation (e.g. foundation providers)

**Effort:** Content-only  
**SEO policy impact:** None if noindex/canonical unchanged

### Option B — New `/resources/scholarshiptop-data-methodology`

**Pros:** Clear URL for E-E-A-T; fits resources cluster; sitemap via dedicated route or CMS  
**Cons:** New page to maintain; needs sitemap inclusion like D16 medical guide

**Effort:** Content + route (requires approval)  
**SEO value:** Trust/GEO moderate; unlikely high-volume queries

### Option C — `/about/data-sources` sibling

**Pros:** Fits trust pages cluster  
**Cons:** Less connected to scholarship content hub

## Recommendation

**Option A first** (extend existing methodology page) — **unless** GSC/GEO team wants a indexable resource URL for "scholarship data sources" queries, then **Option B** with same copy discipline as medical guide.

## Do not do in methodology page

- List raw file paths from customer package
- Quote IRS filings or NIH abstracts
- Imply ScholarshipTop verifies award eligibility via external data
- Add structured data claiming to be a full open-data catalog

## Suggested sections (either option)

```text
1. Purpose — planning context only
2. Sources overview — Scorecard, Census, HUD, BLS, ProPublica, etc.
3. How matching works — strict keys, hidden ambiguous matches
4. What we do not show — residency, hospital quality, block ADI
5. Corrections — link to /corrections
6. Updates — static JSON regeneration cadence (qualitative)
```

## Approval needed

- Editorial copy review
- Whether new indexable resource URL is desired
- No code/data change required for Option A content edit alone

## Verdict

**Worth doing** as lightweight trust enhancement.  
**Not blocking** SEO/GEO vs nursing guide + GSC feedback.  
**Priority:** Medium — after GSC access + URL Inspection on medical guide.
