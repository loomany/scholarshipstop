# D13 Duplicate Link Cleanup Report

Date: 2026-06-01

## Problem (from D12)

Medical guide and career-goals pages showed overlapping link clusters from:
1. `SmartRelatedLinks` (D11 medical cluster)
2. `PremedTopicContextCard` related_links from static JSON
3. Page-level link lists (`Useful internal links` on medical guide; `Related ScholarshipTop pages` on career-goals)

## Changes

### `/resources/medical-scholarships-guide`

| Action | Detail |
|---|---|
| Removed | Entire **Useful internal links** `<h2>` + bullet list from `page.tsx` (7 links duplicating cluster) |
| Hidden | `PremedTopicContextCard` related_links via `showRelatedLinks={false}` |
| Kept | Single `SmartRelatedLinks` block in `MedicalScholarshipPlanningSections` (max 5 links after excludeHref) |
| Kept | Editorial inline links in article body + ResourceGuideShell endReading cards |

### `/essays/career-goals`

| Action | Detail |
|---|---|
| Hidden | `PremedTopicContextCard` related_links via `showRelatedLinks={false}` |
| Kept | Single `SmartRelatedLinks` in `HealthcareCareerGoalsPlanningSection` (4 links) |
| Filtered | `StaticEssayGuidePage` related pages — excludes hrefs already in medical cluster (`filterCareerGoalsRelatedLinks`) |
| Remaining related pills | Essay Mentor, Browse scholarships, Essay outline, STEM scholarships, Financial aid disclaimer |

## Component API

`PremedTopicContextCard` — new optional prop:

```tsx
showRelatedLinks?: boolean  // default true
```

Set `false` when a parent section already renders `SmartRelatedLinks`.

## Rules Enforced

| Rule | Status |
|---|---|
| Max 1 main related-links block per section group | **PASS** |
| No duplicate hrefs within SmartRelatedLinks block | **PASS** (finalizeInternalLinks) |
| No self-links | **PASS** (excludeHref) |
| 3–6 links per cluster | **PASS** (4–5 links) |
| Title explains purpose | **PASS** (renamed titles) |

## Not Changed

- Global helpers (`SmartRelatedLinks`, `internalLinkGraph`, `medicalContentCluster`) — kept intact
- D5 state scholarship link clusters — unchanged
- static JSON `premed_topic_context.json` — unchanged (display-only dedupe)

## Verification (local smoke)

| Route | Duplicate cluster block | Useful internal links section |
|---|---|---|
| `/resources/medical-scholarships-guide` | 1 SmartRelatedLinks block | removed |
| `/essays/career-goals` | 1 SmartRelatedLinks block | cluster hrefs not duplicated in related pills |

Note: Editorial mentions of `/scholarships/category/medical` remain in medical guide body copy (intentional).
