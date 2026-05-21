# Translation cost and model plan (2026-05-19)

**Status: ESTIMATE ONLY** — No bulk OpenAI jobs run. `OPENAI_API_KEY` is present in `.env.local` (value not inspected).

Pricing below uses [OpenAI API pricing](https://platform.openai.com/docs/pricing) as of audit date. **Verify at execution time** — rates change.

---

## 1. Options comparison

| Option | Best for | Quality | Cost | Integration | Glossary |
| --- | --- | --- | --- | --- | --- |
| **A — Manual/Codex static** | UI, static pages, funnel | Highest for UI | Engineer time | Done (Stage 2) | Full control |
| **B — OpenAI API pipeline** | DB batches, fact-preserving MT | High with prompts + review | $–$$$ by volume | Medium (worker + queue) | System prompt + JSON schema |
| **C — DeepL API** | Bulk MT, ES/FR strong | Good for EU langs | Lower $/char | Low | Glossary API |
| **C — Google Cloud Translation** | Scale, many langs | Good | Competitive | Medium | Glossary support |
| **C — Microsoft Translator** | Azure stack | Good | Competitive | Medium | Dictionary files |
| **D — Hybrid (recommended)** | Full site | Best overall | Optimized | Staged | Combined |

### Recommended: **Option D — Hybrid**

| Layer | Method |
| --- | --- |
| UI / static / funnel | Manual/Codex (Stage 2 done; Stage 3A/B remainder) |
| Top DB pages (pilot) | OpenAI with fact-preservation prompt + human review |
| Long-tail draft | OpenAI or DeepL → `draft_machine` → noindex |
| Published | Human-reviewed only |

---

## 2. Token estimation methodology

Dry-run formula (per page, per locale):

```
input_tokens  ≈ (source_chars / 4) + system_prompt_tokens + glossary_tokens
output_tokens ≈ input_tokens × 1.05   (translation expansion factor)
cost          = (input_tokens × input_rate + output_tokens × output_rate) / 1_000_000
```

**Assumptions:**

- Average chars/byte UTF-8 for English body: use `source_chars` from DB field lengths.
- System prompt overhead: ~800 tokens/batch (fact-preservation instructions).
- Structured JSON output adds ~10% output tokens.

### Content-type averages (estimated)

| Type | Avg source chars | Est. input tokens | Est. output tokens | Notes |
| --- | ---: | ---: | ---: | --- |
| Static guide (done) | 8,000 | 2,000 | 2,100 | Already manual |
| Resource CMS article | 12,000 | 3,000 | 3,150 | Long-form |
| Scholarship detail | 6,000 | 1,500 | 1,575 | Mixed facts + prose |
| Provider profile | 3,000 | 750 | 788 | Shorter |
| Category hub | 2,000 | 500 | 525 | Small |
| Compare page | 4,000 | 1,000 | 1,050 | Tabular + intro |

---

## 3. Model recommendations

| Use case | Model | Input $/1M | Output $/1M | Rationale |
| --- | --- | ---: | ---: | --- |
| **DB bulk draft** | `gpt-4o-mini` | $0.15 | $0.60 | Cost-effective; good ES/FR |
| **High-value review pass** | `gpt-4o` | Verify pricing | Verify pricing | Better fact QA on sample |
| **Grader/QA only** | `gpt-4o-mini` | $0.15 | $0.60 | Terminology consistency check |

**Batch API** (50% discount): use for non-urgent queue batches after pilot validation.

**Do not use** legacy SEO/OpenAI generators (`app/api/internal/seo/*`) for localization — separate pipeline with different prompts.

### Fact-preservation system prompt (sketch)

```
You translate scholarship/provider content to {locale}.
RULES:
- Do NOT change: official names, amounts, currencies, dates, URLs, IDs, slugs.
- Translate: headings, body prose, meta description, FAQ questions (not quoted program names).
- Output JSON: { title, meta_title, meta_description, h1, body_html, faq[] }
- If unsure about a fact, copy source verbatim.
```

### JSON schema validation

- Required keys present; max length caps; no HTML script tags.
- Post-process: glossary lock check (regex for `$`, dates, `https://`).

---

## 4. Budget estimates

**Pricing used (verify at run time):** gpt-4o-mini — $0.15/1M input, $0.60/1M output.

### Per-locale cost formula

```
cost_per_page ≈ (input_tokens × 0.15 + output_tokens × 0.60) / 1_000_000
```

### Scenario table (ES **or** FR — multiply ×2 for both)

| Scenario | Pages | Avg tokens in/out | Est. cost/locale | ES+FR |
| --- | ---: | ---: | ---: | ---: |
| Category hubs | 11 | 500 / 525 | **<$0.01** | **<$0.02** |
| Top 100 scholarships | 100 | 1,500 / 1,575 | **~$0.12** | **~$0.24** |
| Top 1,000 scholarships | 1,000 | 1,500 / 1,575 | **~$1.20** | **~$2.40** |
| All scholarships (~19k) | 19,448 | 1,500 / 1,575 | **~$23** | **~$46** |
| Top 100 resources | 100 | 3,000 / 3,150 | **~$0.24** | **~$0.48** |
| All resources (~900) | 900 | 3,000 / 3,150 | **~$2.16** | **~$4.32** |
| Top 100 providers | 100 | 750 / 788 | **~$0.06** | **~$0.12** |
| All providers (~5k) | 5,061 | 750 / 788 | **~$3.05** | **~$6.10** |
| **Pilot batch (recommended)** | 161 | mixed | **~$0.50** | **~$1.00** |
| **Full EN sitemap (~40k)** | 40,114 | ~2,000 avg | **~$50–80** | **~$100–160** |

*Machine translation cost only. Human review (~15–30 min/page for scholarships) dominates total project cost.*

### 10-language extrapolation (future — not planned now)

```
full_site_10_lang ≈ full_en_surface × 9 × avg_cost_per_page_per_locale
                  ≈ 40,114 × 9 × ~$0.002
                  ≈ $720 MT-only (order of magnitude)
```

Quality gates and hreflang infrastructure required before any expansion beyond ES/FR.

---

## 5. Dry-run estimator script (proposed)

Add `scripts/i18n-translation-cost-estimator.ts` (future):

1. Sample N rows per content type from Supabase (read-only).
2. Sum `char_length(title + body + meta)`.
3. Output JSON: `{ type, count, total_chars, est_input_tokens, est_output_tokens, est_cost_usd }`.
4. No OpenAI calls unless `--sample-translate=1` with `--max-pages=3`.

**This audit did not run DB sampling** (no Supabase writes; read-only sample optional in Stage 4 prep).

---

## 6. Pilot batch recommendation

**Stage 4 pilot — 161 pages × 2 locales = 322 translation jobs**

| Bucket | Count |
| --- | ---: |
| Category hubs | 11 |
| Top resources CMS | 50 |
| Top scholarships | 100 |

**Est. OpenAI MT cost:** ~$1.00 total (ES+FR).  
**Est. review effort:** 40–80 engineer/editor hours before any `published` status.

---

## 7. OpenAI API policy compliance

| Rule | Audit action |
| --- | --- |
| Inspect key exists | ✅ present (not exposed) |
| Bulk translation | ❌ not run |
| Large paid jobs | ❌ not run |
| Sample translate | ❌ not needed (static quality already validated) |

---

## 8. Alternative vendor notes

| Vendor | ES/FR quality | API | When to use |
| --- | --- | --- | --- |
| DeepL | Excellent ES/FR | REST | Cheaper bulk draft if OpenAI cost spikes |
| Google | Good | Cloud API | Future 10-lang scale |
| Microsoft | Good | Azure | If already on Azure |

For fact-heavy scholarship content, **OpenAI with structured prompts + human review** remains recommended over raw DeepL for pilot quality.
