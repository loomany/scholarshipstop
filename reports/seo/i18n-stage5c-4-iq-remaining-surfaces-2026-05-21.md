# Stage 5C-4 — IQ remaining surfaces (2026-05-21)

## Implemented

| Surface | ES/FR | Notes |
|---------|-------|-------|
| `ContextualStrategyPaywall` | Yes | `iqContextualStrategyCopy.ts` |
| `ContextualIqReadyChoice` | Yes | Extended `iqContextualFunnelCopy` |
| `StrategyAccountGate` | Yes | `strategyAccount` strings in funnel copy |
| Qualification loading / report prep | Yes | `checkingProfile`, `preparingReportAccess` |
| IQ legal shell (back link, eyebrow) | Yes | `IqLegalPage` client + `iqLegalShellCopy` |
| IQ legal route metadata | Yes | `generateMetadata` on faq/help/about/terms/privacy/refund |

## Deferred (documented)

| Surface | Reason |
|---------|--------|
| IQ legal page body sections | Long English legal copy; metadata + shell only tonight |
| `PostAssessmentQuiz` qualification UI | Shared main-site component; high auth/profile risk |
| Contextual SEO landing `[slug]` mock previews | Large static marketing matrix; separate stage |
| Lemon checkout server errors | Payment logic out of scope |
| Checkout product HTML to Lemon | External MoR config |

## Smoke

`npx tsx scripts/seo/i18n-stage5c-4-iq-remaining-surfaces-smoke.ts` — PASS (local :3020, IQ host header).

## Local commit

`fix(iq): localize remaining ES FR product surfaces` — not pushed.
