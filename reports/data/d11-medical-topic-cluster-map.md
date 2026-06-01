# D11 Medical Topic Cluster Map

Date: 2026-06-01

## Medical scholarships cluster

**Center:** `/resources/medical-scholarships-guide`

**Linked surfaces:**

- `/essays/career-goals`
- `/essays/financial-need`
- `/resources/how-to-find-scholarships`
- `/compare/universities`
- `/scholarships/category/medical`

**D11 additions:**

- Planning sections on the medical guide (data limits, workforce planning note, medical school planning note, source note)
- Cluster links via `buildMedicalClusterLinks({ surface: 'medical-guide' })`

## Nursing scholarships cluster

**Current inventory:** `/scholarships/nursing` long-tail preset only. No dedicated nursing guide page exists.

**Safe D11 approach:**

- Do not invent a new nursing guide page in this pass
- Keep `HealthWorkforceContextBlock` deferred unless a route has an explicit state signal
- Link nursing searchers back to medical guide + career goals essay from cluster map only

## Pre-med scholarships cluster

**Data sources:**

- `premed_topic_context.json`
- `medical_school_enrichment.json`
- `institution_research_enrichment.json`

**Surfaces:**

- Medical guide (direct card)
- Career goals essay (compact card + planning section)
- Dynamic resource/essay cards when slug/title/category explicitly matches healthcare terms
- Provider pages only when exact medical school identity match exists

## Healthcare career goals cluster

**Center:** `/essays/career-goals`

**D11 additions:**

- `HealthcareCareerGoalsPlanningSection`
- Topic card resolves to `stem-to-medical-career-path` instead of first-match page_target index
- Links to medical guide, financial need, how-to-find, compare universities

## Pages that must stay clean

- `/resources/how-to-find-scholarships`
- `/resources/best-scholarship-websites`
- `/essays/financial-need`
- Generic static essay guides except career-goals
- Generic state/compare routes without explicit healthcare intent
