# AI Resources — Stage 6A one-article generation (2026-05-21)

**Slug:** `best-scholarship-websites`  
**Pack:** `ai-resources-2026-05-21`  
**Publish:** not run  
**ES/FR:** not created  
**Commit/push:** none

---

## 1. Pre-write snapshot

| Check | Result |
|-------|--------|
| `content_posts.slug = best-scholarship-websites` | **absent** |
| Pack topics (`source=ai-resources-2026-05-21`) | **0** |
| Slug collision | **0** |

---

## 2. Env (run settings)

Loaded from `services/content-hub/.env` (values not recorded in this report).

| Variable | Value used |
|----------|------------|
| `CONTENT_HUB_ALLOW_PRODUCTION_WRITES` | `1` during run (commented out after) |
| `CONTENT_HUB_AUTO_PUBLISH` | `0` |
| `CONTENT_HUB_POSTS_PER_RUN` | `1` |
| `CONTENT_HUB_BATCH_LIMIT` | `1` |
| `CONTENT_HUB_SOURCE` | `ai-resources-2026-05-21` |
| `OPENAI_MODEL_STANDARD` | `gpt-5.5` |
| `OPENAI_MODEL_SMART` | `gpt-5.5` |

**DB target:** hosted Supabase (production project).

---

## 3. Execution

### 3.1 Seed (1 topic)

```bash
npx dotenv-cli -e services/content-hub/.env -- npx tsx scripts/seed-ai-resources-topics.ts --write --slug best-scholarship-websites
```

- Inserted: **1** row in `content_topics`

### 3.2 First `content:run-once` — failed (no model fallback)

**Error (OpenAI API):**

```text
400 Unsupported value: 'temperature' does not support 0.45 with this model. Only the default (1) value is supported.
```

- Model called: **gpt-5.5** (`seo_brief_generation`)
- Topic re-queued (`finalTopicStatus: queued`)
- No post inserted

**Fix (code, not model change):** [`services/content-hub/src/lib/openai.ts`](../../services/content-hub/src/lib/openai.ts) — omit `temperature` for `gpt-5*` / `o*` models.

### 3.3 Second `content:run-once` — success

- Worker duration: ~**251s**
- Models logged: **gpt-5.5** for `seo_brief_generation` and `article_generation`
- Cover: essay hero reuse (no FAL)
- Insert status: **`review_needed`** (as required)

---

## 4. Created records

### content_topic

| Field | Value |
|-------|--------|
| **id** | `ed3e665f-9e55-4740-ba15-ce229bebce14` |
| **status** | `done` |
| **processed_at** | `2026-05-21T19:42:27.196+00:00` |
| **last_error** | null |

### content_post

| Field | Value |
|-------|--------|
| **id** | `07caa51c-695b-4605-9a3d-24f2688551c0` |
| **topic_id** | `ed3e665f-9e55-4740-ba15-ce229bebce14` |
| **slug** | `best-scholarship-websites` |
| **status** | **`review_needed`** |
| **planned URL** | `/resources/best-scholarship-websites` |
| **title** | Best Scholarship Websites for Students in 2026 |
| **meta_title** | Best Scholarship Websites for Students in 2026 |
| **meta_description** | Compare the best scholarship websites for 2026, including ScholarshipTop, official databases, international directories, filters, pros, cons, and search tips. |
| **excerpt** | Compare the best scholarship websites for 2026, including ScholarshipTop, official databases, international directories, filters, pros, cons, and smarter search tips. |
| **word_count** | **1026** |
| **char_count** | 6456 |
| **primary_keyword** | best scholarship websites |

**Not published:** URL returns publicly only after `status = published`. Sitemap not updated until publish.

---

## 5. Models and cost

| Item | Detail |
|------|--------|
| SEO brief | `gpt-5.5` (~2m 45s in logs) |
| Article (first pass) | `gpt-5.5` (~53s in logs) |
| Expansion retry | not required (metrics passed) |
| Token usage in DB | **not stored** (`metrics_debug` null) |
| Cost estimate | not available from pipeline; heuristic for similar run ~$0.10–0.40 (not billed in repo) |

No fallback to `gpt-4.1` / `gpt-4.1-mini`.

---

## 6. Content quality verdict

Automated HTML/markdown checks on `body_html` + `body_markdown` + `faq_items`:

| Criterion | Pass |
|-----------|------|
| Disclaimer (discovery platform, not provider) | **Yes** |
| Quick Answer | **Yes** |
| Comparison table (`<table>`) | **Yes** |
| Pros / cons | **Yes** |
| Best for | **Yes** |
| How we evaluated | **Yes** |
| FAQ (section + items) | **Yes** (5 FAQ items) |
| `#1` / unsupported superlative claims | **No** detected |

**Overall:** **Pass for Stage 6A test** — structure matches AI pack requirements; tone is comparative, not spammy. Minor validator soft warning during generation: one FAQ answer had only 1 sentence (did not block insert).

**Manual review still recommended** before publish (accuracy of competitor descriptions, link targets, scholarship match relevance).

---

## 7. Post-run safety

- `CONTENT_HUB_ALLOW_PRODUCTION_WRITES` **commented out** in `services/content-hub/.env` after run.
- **Publish script:** not run.
- **Batch 30:** not run.

---

## 8. Files touched (this stage)

| File | Change |
|------|--------|
| `services/content-hub/src/lib/openai.ts` | gpt-5 temperature compatibility |
| `services/content-hub/dist/lib/openai.js` | rebuild |
| `services/content-hub/.env` | writes flag removed after test |
| DB `content_topics` | +1 row (done) |
| DB `content_posts` | +1 row (review_needed) |
| DB `content-images` | +1 cover (essay reuse) |

---

## 9. Next steps (not executed)

1. Human review of article in Supabase / preview route when review UI exists.
2. Approve publish: `publish-unpublished-content.ts` or `content:publish-next` for this slug only.
3. After publish QA: `/resources?cat=ai` count, sitemap, 200 on `/resources/best-scholarship-websites`.
4. Batch 29 remaining topics — separate approval.

---

## 10. Related reports

- [ai-resources-content-hub-audit-2026-05-21.md](./ai-resources-content-hub-audit-2026-05-21.md)
- [ai-resources-dry-run-2026-05-21.json](./ai-resources-dry-run-2026-05-21.json)
