# Stage 4D — Resource translation quality gates (2026-05-21)

**Publish threshold:** `status = 'published'` **and** `quality_score >= 85` (same as category pilot).

---

## Automated gates (CI / pre-publish script)

| # | Gate | Fail action |
| --- | --- | --- |
| 1 | Locale detection ES/FR on `translated_title` + body sample | `review_required` |
| 2 | English leftover ratio on body (allowlist proper nouns, “ScholarshipTop”, “FAFSA”, URLs) | `review_required` |
| 3 | `translated_meta_title` length 30–65 chars (soft warn 28–70) | block publish |
| 4 | `translated_meta_description` length 120–165 chars (soft warn 110–180) | block publish |
| 5 | No new factual entities vs EN (heuristic: new 4-digit years, new `$` amounts) | `review_required` |
| 6 | All `href` hosts ⊆ EN href hosts + allowed internal paths | `blocked` |
| 7 | No `localhost`, `127.0.0.1`, staging hosts | `blocked` |
| 8 | HTML parse / allowlist tags (same sanitizer as `SafeContentPostBody`) | `blocked` |
| 9 | `translated_body` non-empty, min word count ≥ 80% of EN `word_count` | `review_required` |
| 10 | `translated_faq_json` valid array, each item has q+a, no empty strings | `review_required` |
| 11 | Disclaimer present (match EN disclaimer marker phrases) | `review_required` |
| 12 | Internal `/resources/` links → localized only if target translation published | `review_required` |
| 13 | `/scholarships/` links remain EN until detail pilot (do not auto-localize) | warn only |
| 14 | `translated_schema_json` valid JSON if set | `review_required` |
| 15 | `quality_score` computed ≥ 85 | block publish |

---

## Human review checklist (sample 100% for batch 1, 20% batch 2)

- Scam/legal passages match EN severity, not softened or exaggerated
- Deadlines and tax lines unchanged numerically
- FAQ answers not hallucinated
- Mid-article CTAs readable and culturally natural
- Title/H1 alignment

---

## Smoke tests (post-deploy)

Per slug × locale:

- `GET /es/resources/{slug}` → 200, localized `<title>`, no EN body leakage
- `GET /fr/resources/{slug}` → 200
- Missing translation → 404
- `draft` row invisible → 404
- Sitemap contains URL iff published + quality ≥ 85
- Hreflang only includes published locales

Script template: extend `scripts/seo/i18n-category-pilot-smoke.ts` → `i18n-resource-pilot-smoke.ts`.

---

## Scoring rubric (`quality_score`)

| Component | Max points |
| --- | --- |
| Locale purity | 25 |
| Meta lengths | 15 |
| Body completeness vs EN | 20 |
| FAQ valid + complete | 15 |
| Link integrity | 15 |
| Disclaimer retained | 10 |

Deductions: mixed EN sentences (−10 each), new URL host (−30), thin body (−25).
