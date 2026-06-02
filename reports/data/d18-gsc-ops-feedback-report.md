# D18 GSC Ops Feedback Report

Date: 2026-06-01  
Production commit: `4ad9a8c` (D16 sitemap fix live)  
Type: audit/ops only — **no code changes, no commit, no push**

## Executive verdict

**PASS with warnings**

Indexing readiness is **PASS** for all priority indexable URLs. GSC automated feedback is **BLOCKED (403)** — manual export and URL Inspection required to close the loop.

---

## 1. Indexing readiness summary

| Metric | Result |
|---|---|
| Priority indexable URLs checked | 6 |
| HTTP 200 | 6/6 |
| Self-canonical | 6/6 |
| No accidental noindex | 6/6 |
| In sitemap | 6/6 |
| JSON-LD present | 6/6 |
| Content visible | 6/6 |

Detail: `d18-indexing-readiness.csv` + `.md`

**Medical guide:** `resources` bucket — D16 fix confirmed live.

---

## 2. Sitemap status

| URL | Bucket | Status |
|---|---|---|
| Medical guide | resources | **ok** |
| Career goals | essays-0 | **ok** |
| Texas intl resource | resources | **ok** |
| Loyola provider | providers | **ok** |
| How-to-find / best-websites | resources | **ok** |

Noindex pages correctly **not** promoted for indexing requests.

---

## 3. GSC access status

| Channel | Status |
|---|---|
| Search Analytics API | **403 Forbidden** |
| Automated Performance export | **Not available** |
| Manual export checklist | **Created** |
| URL Inspection (UI) | **Available** (manual) |

Files: `d18-gsc-access-status.md`, `d18-gsc-manual-export-checklist.md`, stub `d18-gsc-performance-export.csv`

---

## 4. URL Inspection actions

### Request indexing (if stale/not indexed)

1. `/resources/medical-scholarships-guide`
2. `/essays/career-goals`
3. `/resources/best-scholarships-texas-international-students`
4. `/providers/loyola-university-chicago`

### Inspect only — do NOT request indexing

1. `/scholarships/texas`
2. `/compare/states/california-vs-texas`
3. `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

Detail: `d18-url-inspection-actions.md`

---

## 5. Query-led opportunity scorecard

GSC query data **unavailable** — scorecard uses expected query clusters + manual checks.

| URL | Priority | Next action after export |
|---|---|---|
| Medical guide | P1 | request indexing if stale; monitor impressions |
| Career goals | P1 | title/meta if low CTR |
| Texas intl resource | P1 | title refresh (2024→2026) |
| Loyola provider | P1 | monitor long-tail |
| How-to-find / best-websites | P2 | wait and monitor |

Detail: `d18-query-led-opportunity-scorecard.csv`

---

## 6. Next recommended implementation stage

**D19 — Query-led copy polish** (content-only, after GSC export OR 14-day Inspection monitoring):

1. Title/meta refresh on texas intl resource + any page with impressions + low CTR
2. Nursing scholarships guide if medical guide shows traction
3. Provider manual QA (parallel track from D17)

**Immediate ops (no code):** URL Inspection P1 + GSC permission fix or manual export.

Detail: `d18-next-30-day-gsc-plan.md`

---

## 7. Artifacts

| File | Purpose |
|---|---|
| `d18-preflight.md` | Stage 0 |
| `d18-indexing-readiness.csv` / `.md` | Stage 1 |
| `d18-gsc-access-status.md` | Stage 2 |
| `d18-gsc-manual-export-checklist.md` | Stage 2 |
| `d18-gsc-summary.md` | Stage 2 |
| `d18-gsc-performance-export.csv` | Stage 2 (stub) |
| `d18-url-inspection-actions.md` | Stage 3 |
| `d18-query-led-opportunity-scorecard.csv` | Stage 4 |
| `d18-next-30-day-gsc-plan.md` | Stage 5 |

Audit helpers (local, not product code): `_d18-indexing-readiness.ts`, `_d18-gsc-pull.ts`

## Code changes

**None**

## Commit / push

**None**
