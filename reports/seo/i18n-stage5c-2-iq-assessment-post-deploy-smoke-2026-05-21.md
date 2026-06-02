# Stage 5C-2 — IQ Assessment Post-Deploy Production Smoke

**Date:** 2026-05-21  
**Commit:** `d7e9d79` — `fix(iq): localize ES FR assessment flow`  
**Pushed:** `origin/main` (`068e5b0..d7e9d79`)  
**Deploy:** Vercel production — live after ~90s post-push (production probes + smoke all green)

---

## Production URLs checked

| URL | Status | `data-iq-product-shell-locale` | Main hub leak | `href="/en"` |
|-----|--------|-------------------------------|---------------|--------------|
| https://iq.scholarshiptop.com/assessment | 200 | `en` | No | No |
| https://iq.scholarshiptop.com/es/assessment | 200 | `es` | No | No |
| https://iq.scholarshiptop.com/fr/assessment | 200 | `fr` | No | No |

Also probed `/`, `/es`, `/fr` via smoke script — shell locales `en` / `es` / `fr`, IQ product chrome present, no hub leak.

**`/en` redirect:** `GET /en` → **308** `Location: /` → follow resolves to `https://iq.scholarshiptop.com/` (200). No `/en` page served.

---

## Production smoke command

```bash
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts
```

**Result:** **PASS** (all checks)

| Check | Result |
|-------|--------|
| HTTP `/` … `/fr/assessment` shell + locale markers | Pass |
| No main-site hub leak on IQ paths | Pass |
| No `href="/en"` in HTML | Pass |
| Question bank parity (30 ES/FR overlays) | Pass |
| ES/FR first-3 questions + UI copy (programmatic) | Pass |
| Language switcher hrefs (`/assessment`, `/es/assessment`, `/fr/assessment`) | Pass |
| English `/assessment` shell locale `en` | Pass |

---

## Verification notes (browser vs automated)

Assessment question text, answer options, step/progress/timer labels, and the locale-switch amber notice are **client-rendered** (`AssessmentEngine`); they do not appear in production HTML. Automated smoke validates the localized bank and UI copy modules in-repo plus HTTP routing/locale shell markers.

**Expected in browser after starting the test on production:**

| Locale | First-3 question IDs | UI samples |
|--------|----------------------|------------|
| ES | AR01, NL01, SP01 | `¿Qué opción completa la matriz?`, `Elige una respuesta`, `Paso 1 de 30` |
| FR | AR01, NL01, SP01 | French prompts/options from `questionOverlays/fr.ts`, `Choisissez une réponse`, `Étape 1 de 30` |
| EN | Same IDs | English canonical bank unchanged |

**Locale switch (ES ↔ FR ↔ EN):** Answers keyed by question id; draft stores `locale`; amber notice: *"Language changed — your saved answers are kept…"* (implemented in 5C-2; confirm manually in browser).

**Pre-test intro on `/es/assessment` and `/fr/assessment`:** Page title/metadata and contextual funnel intro may still show English until the user enters the timed assessment — **5C-3** landing scope.

---

## Deploy status

| | |
|--|--|
| **Push successful?** | **Yes** — `main` at `d7e9d79` on GitHub |
| **Production routing live?** | **Yes** — IQ host serves correct shell locales; `/en` → `/` |
| **5C-2 assessment localization live?** | **Yes** — bundles deployed; smoke + probes pass |

---

## Remaining English surfaces (Stage 5C-3)

Per `i18n-stage5c-2-iq-assessment-localization-2026-05-21.md`:

- `ScholarshipIqTestClient` IQ landing (`/`, `/es`, `/fr` home body — not assessment engine)
- `StandardIqPaywall`, checkout/payment copy
- `UnlockedIqReport`, token report page body
- IQ legal/slug static pages where still hardcoded EN
- Main `SiteFooter` scholarship hub links on IQ chrome (acceptable until IQ-specific footer)
- Contextual assessment **pre-start** intro/email phases (outside `AssessmentEngine`)

---

## Verdict

| | |
|--|--|
| **Deploy successful?** | **Yes** |
| **Production smoke?** | **Pass** |
| **Ready for 5C-3?** | **Yes** — paywall, report, landing polish |

---

## Re-run

```bash
SMOKE_BASE_URL=https://iq.scholarshiptop.com npx tsx scripts/seo/i18n-stage5c-2-iq-assessment-smoke.ts
```
