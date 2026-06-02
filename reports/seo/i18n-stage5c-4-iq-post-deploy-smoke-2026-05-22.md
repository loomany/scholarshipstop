# Stage 5C-4 — IQ post-deploy smoke (2026-05-22)

## Deploy

| Field | Value |
|-------|-------|
| Commit pushed | `5c2b659` (cherry-pick of `7e00da7`) |
| Base on remote | `c6d518b` (`origin/main` before push) |
| Branch used | `release/iq-5c-4-only` → `origin/main` |
| Excluded | `b6f4596`, `428feaa`, `3aa208a` |
| Host | `https://iq.scholarshiptop.com` |
| Wait before smoke | ~150s |

## Pre-push gate (local, `release/iq-5c-4-only`)

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npx tsc --noEmit` | PASS |
| IQ unit tests (19) | PASS |
| `i18n-stage5c-2-iq-assessment-smoke.ts` (local :3020) | PASS |
| `i18n-stage5c-3-iq-product-smoke.ts` (local :3020) | PASS |
| `i18n-stage5c-4-iq-remaining-surfaces-smoke.ts` (local :3020) | PASS |

## Production smoke (`SMOKE_BASE_URL=https://iq.scholarshiptop.com`)

### 5C-2 regression

| Route | Result |
|-------|--------|
| `/` | PASS shell=en, no hub leak |
| `/es`, `/fr` | PASS |
| `/assessment`, `/es/assessment`, `/fr/assessment` | PASS |
| Question bank parity | PASS |
| No `/en` in switcher | PASS |

### 5C-3 regression

| Route | Result |
|-------|--------|
| `/`, `/es`, `/fr` | PASS localized titles |
| `/assessment`, `/es/assessment`, `/fr/assessment` | PASS |
| Programmatic ES landing / FR paywall copy | PASS |

### 5C-4 (new)

| Check | Result |
|-------|--------|
| Programmatic ES strategy paywall copy | PASS |
| Programmatic FR ready-choice copy | PASS |
| Programmatic ES legal shell copy | PASS |
| `/es/faq` — shell es, localized title, back link | PASS |
| `/fr/help` — shell fr, localized title, back link | PASS |

### `/en` policy

| Route | Result |
|-------|--------|
| `GET /en` | **308** → `/` (no `/en` index) |

## Client-rendered surfaces (not in HTML smoke)

These are localized in JS bundles; verify in browser after completing contextual assessment:

- `ContextualStrategyPaywall`
- `ContextualIqReadyChoice`
- `StrategyAccountGate`

Routes: `/assessment?intent=…` (and `/es/assessment`, `/fr/assessment`).

## Still English on IQ (expected)

- Legal page **body** sections (metadata + back link localized)
- `PostAssessmentQuiz` qualification steps
- Contextual SEO `/iq/[slug]` landing mock previews

## Local `main` note

Local `main` may still contain unpushed commits `b6f4596`, `428feaa`, `3aa208a`. Remote `origin/main` is only through `5c2b659`. To align local main without losing work:

```powershell
git branch i18n-overnight-wip main
git fetch origin
git checkout main
git reset --hard origin/main
```

## Verdict

**5C-4 production deploy smoke: PASS** (HTTP + programmatic; 5C-2/5C-3 regression PASS).
