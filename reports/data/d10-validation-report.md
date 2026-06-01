# D10 Validation Report

Date: 2026-06-01

## Static Outputs

| Output | Rows | Size |
|---|---:|---:|
| `medical_school_enrichment.json` | 321 | 266.5 KB |
| `health_workforce_context.json` | 52 | 37.9 KB |
| `premed_topic_context.json` | 9 | 11.4 KB |

Total static enrichment size: 10.58 MB.

## Commands

| Check | Result | Notes |
|---|---|---|
| `npm run data:validate-enrichment` | PASS | All 11 static enrichment outputs validated. Existing documented warnings remain for legacy school/city/provider ambiguous keys hidden by loaders. |
| `npm run seo:validate-jsonld` | PASS | 13 JSON-LD sample blocks across 10 cases validated. |
| `npx tsc --noEmit` | PASS | TypeScript passed after adding D10 server-only loaders and components. |
| `npm run build` | PASS | Next app build completed successfully; 206 static pages generated. |

## Local Smoke

Local server: `http://127.0.0.1:3032`

| Route | Status | Expected D10 behavior | Result |
|---|---:|---|---|
| `/resources/how-to-find-scholarships` | 200 | Generic page stays clean; no D10 medical card | PASS |
| `/resources/best-scholarship-websites` | 200 | Generic page stays clean; no D10 medical card | PASS |
| `/resources/medical-scholarships-guide` | 200 | Healthcare planning context appears | PASS |
| `/essays/career-goals` | 200 | Healthcare planning context appears | PASS |
| `/providers/loyola-university-chicago` | 200 | No wrong medical-school match | PASS |
| `/scholarships/texas` | 200 | No broad medical block on generic state page | PASS |
| `/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida` | 200 | No broad medical block on general compare page | PASS |

## Smoke Assertions

- No visible `undefined`, `null`, or `NaN`.
- Generic pages remained clean.
- Medical/pre-med context appeared only on targeted healthcare/career-goals pages.
- No residency/program, board-pass, hospital-quality, NPPES, or Open Payments raw wording appeared.
- No best/worst/ranking wording appeared.
- Canonical URLs rendered as expected; existing `noindex, follow` routes retained their existing policy.
- No Supabase/Auth/Payments files were touched by D10.

## Rollback

Rollback needed: no.
