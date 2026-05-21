# Stage 5C-2 — IQ Assessment Flow Inventory

**Date:** 2026-05-21

## Files in assessment flow

| File | Role |
|------|------|
| `lib/cognitiveAssessmentQuestions.ts` | Canonical EN bank (30 items), types, scoring fields |
| `lib/iq/i18n/getLocalizedIqQuestions.ts` | Merge EN + ES/FR overlays |
| `lib/iq/i18n/questionOverlays/es.ts` | Spanish text overlays by question `id` |
| `lib/iq/i18n/questionOverlays/fr.ts` | French text overlays by question `id` |
| `lib/iq/i18n/iqAssessmentUiCopy.ts` | Assessment UI strings (intro, progress, analyzer) |
| `lib/iq/i18n/iqAssessmentLabels.ts` | Domain, difficulty, archetype labels |
| `components/iq/AssessmentEngine.tsx` | Intro → questions → analyzer |
| `components/iq/assessmentScoring.ts` | Score math + localized labels in results |
| `app/iq/GeneralIqFunnelClient.tsx` | General funnel → `AssessmentEngine` |
| `app/iq/assessment/ContextualAssessmentFunnelClient.tsx` | Contextual funnel → shared engine |
| `lib/iqAssessmentTypes.ts` | `AssessmentResult` shape (unchanged) |

## Question bank counts

| | Count |
|--|-------|
| Questions | 30 |
| Options per question | 4 (A–D) |
| Questions with visual caption | 12 |
| Explanations | 30 (stored; not shown in live UI during test) |

## User-visible labels (5C-2 scope)

- Question prompts and option text
- Visual title/caption (when shown)
- Domain chip, difficulty chip, timer, restart
- Progress: step X of Y, %
- Intro cards and CTA
- Analyzer title + rotating messages
- Domain names and archetype string in `AssessmentResult`

## Stable fields (must not change)

- `id`, `domain`, `difficulty`, `weight`, `time_limit_sec`
- `correct_option`, option keys A–D
- `answers` map keys = question ids
- `weightedScore`, `iqScore`, `percentile` formulas
- `AssessmentResult` JSON schema

## Safe to translate

- `prompt`, `options.*`, `explanation`, `visual.title/caption`
- UI copy in `iqAssessmentUiCopy`
- `domainScores[].label`, `archetype` display string at score time

## Locale + storage (5C-2 decision)

- **Pathname** drives locale (`x-iq-locale` from 5C-1).
- Draft key bumped to `iq_general_assessment:v2` / `iq_contextual_assessment:v2`.
- Draft JSON includes `locale`; **answers kept by question id** when user switches `/` ↔ `/es` ↔ `/fr` mid-test.
- One-time **amber notice** when locale in storage differs from active pathname locale.

## Out of scope (5C-3+)

- `ScholarshipIqTestClient` landing marketing
- `StandardIqPaywall`, `UnlockedIqReport`
- `CognitiveAssessmentEngineClient` (legacy standalone page client)
- Legal/slug landings, `generateStrategy` templates
