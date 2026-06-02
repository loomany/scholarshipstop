# Stage 4D — Resource translation method plan (2026-05-21)

**No translation executed in this audit.**

---

## Options

| Option | Description | Safety | Throughput |
| --- | --- | --- | --- |
| **A — Manual / Codex** | Authors write ES/FR copy from EN `body_html` + FAQ | Highest | Low (~2–4 articles / day / reviewer) |
| **B — OpenAI JSON** | Structured prompt → JSON fields → validator → publish | Medium | High |
| **C — Hybrid** | OpenAI `draft_machine` → human/Codex review → `published` | **Best balance** | Medium-high |

---

## Recommendation

**Stage 4D.1:** **Option A (Manual/Codex)** for the first **25** articles × 2 locales (**50 rows**).

**Stage 4D.2:** Introduce **Option C** for articles 26–50 after gates and prompt template are proven on 5–10 spot checks.

**Do not** run unattended Option B bulk on 50+ resource articles in the first production drop — factual and scam-advice risk is higher than category listings.

---

## Volume estimates

Assumptions: ~1,400 words/article, ~8 chars/word, FAQ ~800 chars, meta ~300 chars.

| Batch | Rows (ES+FR) | Source chars (approx) | Input tokens (approx) | Output tokens (if MT) | OpenAI cost @ $2.50/$10 per 1M (rough) |
| --- | --- | --- | --- | --- | --- |
| Top **25** | 50 | ~3.5M chars → ~0.9M tokens | ~0.9M | ~1.0M | **~$12–15** MT only |
| Top **50** | 100 | ~7M chars → ~1.8M tokens | ~1.8M | ~2.0M | **~$25–30** MT only |

**Review workload (hybrid or manual):**

| Batch | Human review hours (est.) |
| --- | --- |
| 25 articles × 2 locales | **40–80 h** (45–90 min / article-locale for HTML+FAQ+links) |
| 50 articles × 2 locales | **80–160 h** |

Codex-only first 25 without MT: similar review time, no API cost, slower calendar time.

---

## Prompt requirements (when Option B/C is enabled)

Output **JSON only** with keys matching `content_translations` columns.

**System rules:**

1. Preserve all facts, numbers, dates, and proper nouns from EN.
2. Do not invent scholarships, providers, or government programs.
3. No guaranteed awards or outcomes.
4. Retain official-source / not-financial-advice disclaimer meaning.
5. Preserve `href` URLs exactly; do not add localhost or private hosts.
6. Keep HTML tag structure; translate visible text nodes only.
7. Leave scholarship/provider names in original language unless standard localized form exists.
8. Flag uncertainty in `_review_flags[]` instead of guessing.

**Validation flags (automated):**

- `mixed_language_ratio`
- `deadline_year_in_body`
- `new_url_hosts`
- `empty_faq`
- `meta_title_length`
- `forbidden_phrases` (e.g. “guaranteed scholarship”)

---

## Seed / publish workflow (implementation phase)

1. Curated slug list → resolve UUIDs from `content_posts`
2. Insert `content_translations` with `status = draft_agent` or `review_required`
3. Run quality gate script (no publish until pass)
4. Set `published`, `quality_score >= 85`, `published_at`
5. Revalidate + deploy smoke (mirror `i18n-stage4c4-production-deploy-smoke.ts`)

**Guards:** `I18N_PILOT_ALLOW_DB_WRITES=1`, `I18N_PILOT_ALLOW_PRODUCTION=1` only when explicitly approved.
