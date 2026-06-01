# D14 Server Render Duplication Audit

Date: 2026-06-01

## Helper Call Patterns Reviewed

| Helper | Typical call count per page | Cached? | Issue? |
|---|---|---|---|
| `resolveScholarshipStateContext` | 1× in state sidebar | Index via `getStateAffordability` | No |
| `resolveScholarshipUniversityContext` | 1× in university sidebar | Same | No |
| `getStateSocialContext` | 1× per sidebar/compare column | Lazy Map index | No |
| `getInstitutionResearchBySchool` | 1–2× (compare: 2 schools) | Lazy index | No |
| `getRentMetroContextForSchool` | 1–2× | Lazy index | No |
| `matchSchoolForInstitution` | 1–2× on compare | Lazy index | No |
| `getPremedTopicContext` | 1× on medical guide | 9-row index | No |

## Duplicate Render (not duplicate lookup)

**Primary issue:** nested UI blocks re-rendered identical `DataSourceFooter` markup multiple times per page — not repeated JSON loading, but wasted HTML bytes and DOM weight.

Affected surfaces:

- State scholarship sidebar
- University scholarship sidebar
- Compare state/university sections
- Provider school context
- Resource/essay external context cards
- Medical guide (topic card + planning source section)

## Generic Page Guards

| Route type | Heavy lookup skipped? |
|---|---|
| Generic resources (`how-to-find`, `best-scholarship-websites`) | **Yes** — suppress lists / no match |
| Generic essays (`financial-need`) | **Yes** |
| Foundation providers without match | **Yes** — returns null |

No change needed to guard logic.

## Safe Fix Applied

- `showSourceFooter` prop on nested data-viz blocks (default `true` for standalone use)
- Parent sections pass `showSourceFooter={false}` when consolidated footer exists
- Medical guide: `showSourceFooter={false}` on topic card; inline source note only in planning section

## Not Changed (intentionally)

- Scholarship listing query/ranking logic
- Compare bar metric computation (requires both schools)
- Lazy index architecture in `lib/external-data/*`

## Verdict

**FIXED (HTML duplication)** — no expensive lookup duplication found; footer markup was the main safe win.
