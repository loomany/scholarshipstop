# OpenAI translation cost plan (2026-05-20)

**No bulk OpenAI jobs were run in this audit.**

Pricing reference: [OpenAI API pricing](https://platform.openai.com/docs/pricing) — verify at execution. Estimates use **gpt-4o-mini** at **$0.15/1M input**, **$0.60/1M output**.

---

## 1. Model recommendation

| Role | Model | Rationale |
| --- | --- | --- |
| **Bulk draft (ES/FR)** | `gpt-4o-mini` | Best cost/quality for ES/FR prose |
| **QA sample / high-value pages** | `gpt-4o` | Stronger fact checking on scholarships |
| **Cheaper alternative** | DeepL API | Lower $/char; weaker glossary control |
| **Not for localization** | Legacy `app/api/internal/seo/*` | Different prompts; do not reuse |

**Review strategy:** 100% human review for pilot (161 pages); sample 10% for scale.

**Prompt strategy:** Fact-preservation system prompt + JSON schema output (`title`, `meta_title`, `meta_description`, `h1`, `body_html`, `faq[]`).

**Validation:** Zod/JSON schema, max lengths, glossary lock on amounts/dates/URLs.

**Glossary:** Locked terms file — ScholarshipTop, GPA, STEM, official program names.

---

## 2. Cost formula

Per page, per locale:

```
input_tokens  ≈ (source_chars / 4) + 800 (system prompt)
output_tokens ≈ input_tokens × 1.05
cost_usd      = (input_tokens × 0.15 + output_tokens × 0.60) / 1_000_000
```

**ES + FR:** multiply single-locale cost by **2**.

**Batch API:** ~50% discount for non-urgent queue (after pilot).

---

## 3. Scenario estimates (ES + FR both locales)

| Batch | Pages (×2 locales) | Est. MT cost | Human review (order of mag.) |
| --- | ---: | ---: | --- |
| Top 50 resources | 100 | **~$0.48** | 25–40 h |
| Top 100 scholarships | 200 | **~$0.24** | 50–80 h |
| Top 50 providers | 100 | **~$0.12** | 15–25 h |
| **Recommended pilot total** | 400 rows | **~$1.00** | 90–145 h |
| 1,000 pages | 2,000 | **~$2.40** | — |
| All scholarships (~19.4k) | ~38.9k | **~$46** | — |
| All DB (~40k EN URLs) | ~80k | **~$100–160** | — |

*Machine translation only. Human review dominates total project cost.*

---

## 4. Future 10-language expansion (not planned now)

Rough MT-only extrapolation:

```
40,114 EN pages × 9 additional locales × ~$0.002/page/locale ≈ $720 MT-only
```

Requires hreflang infrastructure, `content_translations` for 10 locales, and quality gates per market.

---

## 5. Anti-spam / SEO gates

- `noindex` until `published`
- No hreflang for drafts
- No thin auto-translate at scale without review
- Stale → drop from sitemap
- Do not translate official scholarship/provider names by default

---

## 6. Execution order (recommended)

1. 11 category hubs (small, high intent)
2. Top 50 resources CMS
3. Top 100 scholarships
4. Top 50 providers
5. Scale with `draft_machine` + review queue

---

## 7. Dry-run script (proposed next sprint)

`scripts/i18n-translation-cost-estimator.ts` — read-only Supabase sample, char counts, cost projection, **no OpenAI calls** unless `--sample=3`.
