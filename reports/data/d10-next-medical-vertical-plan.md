# D10 Next Medical Vertical Plan

Date: 2026-06-01

## Should ScholarshipTop Create Medical-School Scholarship Pages?

Yes, but not as an automatic launch from D10. The data layer is now ready for a
future medical/pre-med/nursing vertical, but product and content approval should
come first because these pages would mix scholarship search intent with health
education, workforce, and school context.

## Safe URL Patterns To Consider Later

- `/resources/pre-med-scholarships`
- `/resources/nursing-scholarships`
- `/resources/medical-school-scholarships`
- `/scholarships/category/medical`
- `/scholarships/nursing`
- `/scholarships/pre-med`
- `/medical-schools/[state]`
- `/medical-schools/[state]/[school]`

## Sources That Can Power The Future Vertical

- `medical_school_enrichment.json`
  - WDOMS, LCME, COCA, AACOM, public admissions-summary availability, aggregate research joins.
- `health_workforce_context.json`
  - BLS state OEWS selected health occupations and HRSA HPSA aggregate state counts.
- `premed_topic_context.json`
  - Curated topic index for pre-med, medical-school, nursing, rural healthcare, workforce, first-generation, and financial-need contexts.
- Existing D8/D9 outputs
  - `institution_research_enrichment.json`
  - `state_social_context.json`
  - `city_rent_metro_enrichment.json`
  - `school_enrichment.json`
  - `state_affordability.json`

## Needs Approval Before Launch

- Content strategy: which medical/nursing/pre-med URLs should exist.
- Legal/compliance review for any page that discusses admissions, healthcare shortages, or service obligations.
- Product approval for whether medical-school pages belong on the main ScholarshipTop surface or a separate vertical.
- Editorial guidance for avoiding medical advice, admissions guarantees, eligibility promises, and ranking language.
- Matching policy for schools with parent universities, branch campuses, and separately named medical schools.

## Do Not Launch Yet

- Residency program pages.
- Hospital quality comparison pages.
- Board pass rate pages.
- Provider pages based on NPPES, Open Payments raw, CMS hospital-quality data, or hospital-only source matching.
- Any mass-generated medical-school page set without editorial review and route policy approval.

## Recommended Next Step

Create a small product/content brief for a future Medical / Nursing Scholarship
Vertical and decide whether to start with one or two resource pages before
shipping school or state URL clusters.
