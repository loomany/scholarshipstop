# D13 Target Page Audit

Date: 2026-06-01

## Summary

| Route | Primary component(s) | D13 action |
|---|---|---|
| `/resources/medical-scholarships-guide` | `page.tsx`, `MedicalScholarshipPlanningSections`, `PremedTopicContextCard` | Copy polish + dedupe links |
| `/essays/career-goals` | `StaticEssayGuidePage`, `HealthcareCareerGoalsPlanningSection`, `PremedTopicContextCard` | Copy polish + dedupe links |
| `/scholarships/texas` … `/illinois` | `ScholarshipStateExternalContextSidebar` | GEO summary copy |
| `/compare/states/california-vs-texas` | `CompareExternalStateAffordabilitySection` | **Skipped** — already strong; no copy issues |
| `/compare/universities/...` | `CompareExternalSchoolEnrichmentSection` | **Skipped** — D13 scope is state/medical/career |

---

## Route Details

### `/resources/medical-scholarships-guide`

| Field | Value |
|---|---|
| Files | `app/resources/medical-scholarships-guide/page.tsx`, `MedicalScholarshipPlanningSections.tsx`, `PremedTopicContextCard.tsx` |
| Current enrichment | Premed topic card, D11 planning sections, SmartRelatedLinks cluster, source note |
| Copy issue | Sections were data-accurate but dense; missing lead GEO summary |
| Duplicate links | **Yes** — bottom “Useful internal links” list duplicated SmartRelatedLinks cluster; PremedTopicContextCard also rendered related_links |
| Recommended edit | Add planning summary lead; polish section copy; remove duplicate link list; hide card related_links |
| Risk | Low |

### `/essays/career-goals`

| Field | Value |
|---|---|
| Files | `StaticEssayGuidePage.tsx`, `HealthcareCareerGoalsPlanningSection.tsx`, `PremedTopicContextCard.tsx` |
| Current enrichment | STEM-to-medical topic card, healthcare planning section, related pages pills |
| Copy issue | Planning section not essay-writing focused enough |
| Duplicate links | **Yes** — cluster links overlapped PremedTopicContextCard links and `guide.links` related pages |
| Recommended edit | Essay-focused copy; hide card links; filter related pages against cluster |
| Risk | Low |

### `/scholarships/texas`, `/california`, `/new-york`, `/florida`, `/illinois`

| Field | Value |
|---|---|
| Files | `ScholarshipStateExternalContextSidebar.tsx`, `StateSocialContextBlock.tsx`, `DataSourceFooter.tsx` |
| Current enrichment | Income/rent/wage stats, mini bars, social context, D5 link cluster |
| Copy issue | Metrics shown without plain-language “why this matters” summary |
| Duplicate links | No |
| Recommended edit | Add GEO summary + InsightCallout; improve social context wording |
| Risk | Low — sidebar placement unchanged (listing not pushed down) |

### `/compare/states/california-vs-texas`

| Field | Value |
|---|---|
| Files | `CompareExternalStateAffordabilitySection.tsx` |
| Copy issue | None blocking |
| Duplicate links | No |
| Recommended edit | Skip — out of D13 primary scope |
| Risk | N/A |

### `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida`

| Field | Value |
|---|---|
| Files | `CompareExternalSchoolEnrichmentSection.tsx` |
| Copy issue | None blocking |
| Duplicate links | No |
| Recommended edit | Skip |
| Risk | N/A |

### Generic control pages

| Route | Expected | Risk |
|---|---|---|
| `/resources/how-to-find-scholarships` | Clean | Must stay clean |
| `/resources/best-scholarship-websites` | Clean | Must stay clean |
