# D15 Search Console / Indexing / Crawl Feedback Report

Date: 2026-06-01  
Production commit: `b50e801` (D14 live)  
Type: audit only — **no code changes, no commit, no push**

## Executive verdict

**PASS with warnings**

Production technical SEO for the D15 priority URL set is healthy: HTTP 200, self-canonical, robots policy matches expectations, JSON-LD present, D1–D14 enrichment visible. Warnings: indexable medical guide missing from sitemap; GSC API unavailable; large HTML payloads and intermittent latency on some enriched routes.

---

## 1. Technical health summary

| Check | Result |
|---|---|
| Priority URLs (19) | 19/19 HTTP 200 |
| Accidental noindex on indexable types | None |
| State listings noindex | 5/5 correct |
| Compare detail noindex | 2/2 correct |
| University hubs index | 2/2 correct |
| Self-canonical | 19/19 |
| Title + meta description | 19/19 present |
| JSON-LD | 4–12 blocks per URL |
| Visible undefined/null/NaN | None (raw HTML false positives only) |

Detail: `d15-production-technical-checks.md` + `.csv`

---

## 2. Sitemap / robots summary

**robots.txt:** PASS — allows `/`, blocks `/api/`, declares sitemap index + RSS.

**Sitemap index:** Healthy; multiple buckets (core, resources, essays, providers, seo, scholarships-0, compare, localized).

**Key findings:**

| Finding | Severity |
|---|---|
| `/resources/medical-scholarships-guide` not in any sitemap | **High** — indexable P1 page |
| Indexable CMS resources/essays/providers in correct buckets | OK |
| State noindex pages listed in `seo.xml` | Note — existing policy |
| Compare detail CA-vs-TX absent from sitemap | OK for noindex |
| Compare detail UMass-vs-USF in `seo.xml` but page noindex | Note — inconsistency |

Detail: `d15-sitemap-robots-audit.md` + `d15-sitemap-url-presence.csv`

---

## 3. Search Console summary

| Item | Status |
|---|---|
| Automated data pull | **Failed** — 403 permission on property |
| Manual checklist | Created |
| Impressions/clicks/CTR/position | **Not available** in this audit |

Use `d15-search-console-manual-checklist.md` to complete the feedback loop.

---

## 4. Priority URL index / inspect list

### Request indexing (indexable only)

1. `/resources/medical-scholarships-guide`
2. `/essays/career-goals`
3. `/providers/loyola-university-chicago`
4. `/resources/best-scholarships-texas-international-students`

### Inspect only — do NOT request indexing

1. `/scholarships/texas`
2. `/compare/states/california-vs-texas`
3. `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

Detail: `d15-url-inspection-priority-list.md`

---

## 5. Leave noindex (by design)

- All state scholarship listings: `/scholarships/texas`, `/california`, `/new-york`, `/florida`, `/illinois`
- Compare battle detail pages: CA-vs-TX, UMass-vs-USF

These remain valuable for users and internal linking; current `noindex, follow` policy is intentional.

---

## 6. SEO/GEO opportunity highlights

Top scores (see `d15-seo-geo-opportunity-scorecard.csv`):

| Score | URL | Action |
|---:|---|---|
| 9 | Medical scholarships guide | submit/index inspect + sitemap fix |
| 8 | Career goals essay | submit/index inspect |
| 8 | Texas intl students resource | submit/index inspect |
| 8 | Loyola provider | submit/index inspect |

---

## 7. Next recommended implementation step

**Approved follow-up (post-D15):** Add `/resources/medical-scholarships-guide` to the production sitemap (resources or core bucket) and grant GSC property access to the indexing service account — then re-run URL Inspection on P1 URLs.

Secondary: refresh “2024 Guide” in texas intl resource title when copy cycle allows.

Roadmap: `d15-next-30-day-seo-geo-plan.md`

---

## 8. Artifacts

| File | Purpose |
|---|---|
| `d15-preflight.md` | Stage 0 |
| `d15-priority-url-set.csv` | Stage 1 |
| `d15-production-technical-checks.csv` / `.md` | Stage 2 |
| `d15-sitemap-robots-audit.md` | Stage 3 |
| `d15-sitemap-url-presence.csv` | Stage 3 |
| `d15-search-console-manual-checklist.md` | Stage 4 |
| `d15-search-console-summary.md` | Stage 4 |
| `d15-url-inspection-priority-list.md` | Stage 5 |
| `d15-seo-geo-opportunity-scorecard.csv` | Stage 6 |
| `d15-next-30-day-seo-geo-plan.md` | Stage 7 |

## Code changes

**None**

## Commit / push

**None**
