# Stage 5C-2 — IQ Assessment ES/FR Localization

**Date:** 2026-05-21  
**Not committed / not pushed** (per instructions).

---

## Summary

Localized the core IQ cognitive assessment for Spanish and French: 30 questions × 4 options, visual captions, assessment UI chrome, domain/difficulty labels, and archetype strings at score time. English behavior and scoring math unchanged.

---

## Files changed

| File | Change |
|------|--------|
| `lib/iq/i18n/getLocalizedIqQuestions.ts` | Merge EN bank + ES/FR overlays |
| `lib/iq/i18n/questionOverlays/types.ts` | Overlay types |
| `lib/iq/i18n/questionOverlays/es.ts` | 30 Spanish overlays |
| `lib/iq/i18n/questionOverlays/fr.ts` | 30 French overlays |
| `lib/iq/i18n/iqAssessmentUiCopy.ts` | Intro, progress, analyzer, controls |
| `lib/iq/i18n/iqAssessmentLabels.ts` | Domain, difficulty, archetype labels |
| `lib/iq/i18n/iqAssessmentStorage.ts` | Draft version constant (reference) |
| `lib/iq/i18n/__tests__/iqQuestions.test.ts` | Parity + scoring tests |
| `components/iq/assessmentScoring.ts` | Locale-aware labels/archetype |
| `components/iq/AssessmentEngine.tsx` | Locale-driven questions + UI |
| `app/iq/GeneralIqFunnelClient.tsx` | Storage key `v2` |
| `app/iq/assessment/ContextualAssessmentFunnelClient.tsx` | Storage key `v2` |
| `scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts` | Local assessment smoke |
| `reports/seo/i18n-stage5c-2-iq-assessment-inventory-2026-05-21.md` | Inventory |

---

## Question bank strategy

- **Canonical:** `lib/cognitiveAssessmentQuestions.ts` (English, unchanged structure).
- **Overlays:** `IQ_QUESTION_OVERLAY_ES` / `IQ_QUESTION_OVERLAY_FR` keyed by question `id`.
- **Helper:** `getLocalizedIqQuestions(locale)` copies scoring fields from EN and replaces user-facing text only.
- **Counts:** 30 questions, 120 option labels, 12 visual title/caption pairs per locale.

---

## Locale switching during test

**Decision (v1):** Keep answers by question/option id; relabel prompts when pathname locale changes; show amber `localeSwitchNotice` once if draft had progress under another locale.

- Draft includes `locale` field.
- Storage keys bumped to `:v2` (old `v1` drafts ignored).

---

## UI labels translated

Intro badge/title/body, 3 summary cards, start button, step/progress, time left, start again, choose one answer, question number, analyzer title + 3 messages, domain/difficulty chips.

---

## Still English (5C-3)

- `ScholarshipIqTestClient` landing page
- `StandardIqPaywall`, `UnlockedIqReport`, token report page body
- `CognitiveAssessmentEngineClient` (legacy alternate UI on assessment route internals)
- Main `SiteFooter` scholarship links
- Checkout server error strings (optional later)

---

## Tests / build

| Command | Result |
|---------|--------|
| `node --import tsx --test lib/iq/i18n/__tests__/iqPaths.test.ts lib/iq/i18n/__tests__/iqQuestions.test.ts` | 11/11 pass |
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

**Local smoke:** `npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts` (requires dev/prod server + `SMOKE_BASE_URL`, `x-forwarded-host`).

---

## Risks

1. **Stored results:** New assessments store localized `archetype` / domain labels — mixed language if user switches locale after completing but before paywall (edge case).
2. **Legacy `v1` drafts** cleared by key bump — users mid-test may restart once.
3. **RSC + client nav:** Question text updates on locale navigation; verify manually on mobile.
4. **Large overlay files** — future edits need parity test (`assertLocalizedQuestionBankParity`).

---

## Final verdict

| Question | Answer |
|----------|--------|
| **Ready for push/deploy?** | **Yes** — after quick manual check of `/es/assessment` first question on IQ host. |
| **Ready for 5C-3 (report/paywall)?** | **Yes** — assessment path complete; paywall/report templates next. |
