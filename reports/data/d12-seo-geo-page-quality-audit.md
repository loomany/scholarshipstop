# D12 SEO/GEO Page Quality Audit

Date: 2026-06-01  
Scope: Production smoke + code review of D1–D11 enrichment guards

## Evaluation Criteria

For each page group: visible helpful context, source notes, internal links, structured data, charts/comparisons, keyword stuffing, fake claims, dangerous eligibility/safety/ranking claims, generic-page pollution.

---

## Compare Pages

### `/compare/states` (hub) and `/compare/states/california-vs-texas`

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Strong** on detail — median income, HUD FMR, living wage, BLS wage, neutral public-safety note |
| Source notes | **Yes** — `DataSourceFooter` with methodology |
| Internal links | **Yes** — D5 cluster: scholarships per state, compare universities, how-to-find, financial need |
| Structured data | WebPage + FAQPage; no fake ratings |
| Charts / comparisons | **Yes** — D1 CSS comparison bars (state vs state) |
| Keyword stuffing | No |
| Fake / dangerous claims | No rankings asserted; FBI shown neutrally |
| Generic pollution | N/A — compare-only surfaces |

### `/compare/universities/...`

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Strong** — tuition, net price, earnings, completion, admission bars; D9 rent/metro cards |
| Source notes | **Yes** |
| Internal links | **Yes** — state scholarship pages, state-vs-state when applicable |
| Structured data | WebPage + FAQPage |
| Charts / comparisons | **Yes** — school bars + rent context |
| Risks | Largest compare HTML (~273 KB); monitor payload |

---

## Scholarship Pages

### `/scholarships/[state]` (Texas, California checked)

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Strong** — affordability sidebar (income, rent, living wage, BLS) |
| Source notes | **Yes** |
| Internal links | **Yes** — compare states/universities, resources, essays |
| Structured data | BreadcrumbList + WebPage + ItemList |
| Charts | Mini planning bars (income vs rent) |
| SEO note | `noindex, follow` by policy — enrichment supports UX/GEO, not index expansion |
| Risks | Slow TTFB (~3–11s); listing payload dominates |

### `/scholarships/[state]/[university]`

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Strong** — cost snapshot + state sidebar |
| Internal links | **Yes** — state hub, compare, resources |
| Indexing | `index, follow` — good candidate for growth once copy polish done |

---

## Provider Pages

### `/providers/loyola-university-chicago`

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Strong** — Scorecard metrics, cost/outcomes bars |
| Source notes | **Yes** |
| Internal links | **Yes** — Illinois scholarships, compare, how-to-find |
| Medical false match | **Clean** — no Stritch School of Medicine block |
| Structured data | EducationalOrganization when school match visible |

### `/providers/alamo-colleges-foundation`

| Criterion | Assessment |
|---|---|
| Enrichment | **None** — foundation without strict nonprofit/school match |
| Pollution | **Clean** — no forced context |
| Opportunity | ProPublica nonprofit match could improve if EIN/name confidence improves |

---

## Resources

### `/resources/medical-scholarships-guide` — **Strongest resource page**

| Criterion | Assessment |
|---|---|
| Visible helpful context | Medical school card, workforce planning, data limits, source note |
| Internal links | D11 medical cluster (career goals, financial need, how-to-find, compare, medical category) |
| Structured data | FAQPage (existing) |
| Keyword stuffing | No |
| Fake claims | Explicit “what data can/cannot tell you” guardrails |

### `/resources/best-scholarships-texas-international-students`

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Moderate** — Texas state planning context via D2 resolver |
| Internal links | D2 related scholarship context links |
| Risks | Slow response in smoke (~31s outlier); content appropriate |

### `/resources/how-to-find-scholarships` and `/resources/best-scholarship-websites`

| Criterion | Assessment |
|---|---|
| Enrichment pollution | **Clean** — suppress list working (`HEALTHCARE_TOPIC_SUPPRESS_SLUGS`) |
| Internal links | Editorial only on how-to-find; no D11 medical blocks |

---

## Essays

### `/essays/career-goals`

| Criterion | Assessment |
|---|---|
| Visible helpful context | **Strong** — STEM-to-medical topic card + healthcare career goals planning section |
| Internal links | Medical guide, financial need, how-to-find, compare universities |
| Structured data | Article + FAQPage |
| Minor note | Some duplicate hrefs in page (medical guide appears twice in nav + cluster) — cosmetic only |

### `/essays/financial-need`

| Criterion | Assessment |
|---|---|
| Enrichment pollution | **Clean** |

---

## Final Classification

### Strong pages

- `/compare/states/california-vs-texas`
- `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`
- `/scholarships/texas`, `/scholarships/california`
- `/scholarships/texas/tarleton-state-university`, `/scholarships/california/california-state-university-northridge`
- `/providers/loyola-university-chicago`
- `/resources/medical-scholarships-guide`
- `/essays/career-goals`

### Needs improvement

- `/providers/alamo-colleges-foundation` — no nonprofit enrichment surfaced (data gap, not bug)
- State scholarship pages — copy blocks could be stronger for GEO summaries (content polish, not data)
- `/resources/best-scholarships-texas-international-students` — response time outlier worth monitoring

### Too heavy / monitor

- `/scholarships/texas` — slowest route, ~183 KB HTML, 458 kB First Load JS route bundle
- `/compare/universities/...` — ~273 KB HTML, 321 kB First Load JS
- `/providers/loyola-university-chicago` — ~297 KB HTML (listing + profile)
- Static data layer — 10.58 MB total (safe, but 2.7x D7 baseline)

### Clean generic pages

- `/resources/how-to-find-scholarships`
- `/resources/best-scholarship-websites`
- `/essays/financial-need`
- Compare/university hub pages (teaser only)
- Scholarship/compare routes without healthcare intent (no D11 medical blocks)

## Verdict

**PASS with warnings** — enrichment is scoped, helpful, and guarded; performance on heavy listing routes remains the main monitor item.
