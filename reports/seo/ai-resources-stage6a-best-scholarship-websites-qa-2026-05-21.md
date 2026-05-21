# QA: best-scholarship-websites (Stage 6A.1)

**content_post id:** `07caa51c-695b-4605-9a3d-24f2688551c0`  
**slug:** `best-scholarship-websites`  
**status:** `review_needed`  
**verdict:** **needs edits** (light — publish after small fixes)  
**Date:** 2026-05-21  
**Publish:** not performed  
**DB writes:** none  

**Preview:** [ai-resources-stage6a-best-scholarship-websites-preview-2026-05-21.md](./ai-resources-stage6a-best-scholarship-websites-preview-2026-05-21.md)

---

## 1. Metadata summary

| Field | Value |
|-------|--------|
| title | Best Scholarship Websites for Students in 2026 |
| slug | best-scholarship-websites |
| status | review_needed |
| h1 | Best Scholarship Websites for Students in 2026 |
| word_count (DB) | 1026 |
| meta_title | Best Scholarship Websites for Students in 2026 (46 chars) |
| meta_description | Compare the best scholarship websites for 2026, including ScholarshipTop, official databases, international directories, filters, pros, cons, and search tips. (158 chars) |
| excerpt | Compare the best scholarship websites for 2026, including ScholarshipTop, official databases, international directories, filters, pros, cons, and smarter search tips. |

Meta title/description: **acceptable** for SERP (within typical limits).

---

## 2. Structural checklist

| Criterion | Pass | Notes |
|-----------|------|--------|
| Quick answer | **Yes** | Dedicated H2 + concise mix-of-sources answer |
| Comparison table | **Yes** | Markdown table: Website type / Best for / Strengths / Watch out for |
| Pros / cons | **Yes** (partial) | Table “Strengths / Watch out for” + H2 “Honest Pros, Cons, and Best Fit” (narrative, not bullet pros/cons blocks) |
| Best for | **Yes** | In table column and narrative |
| How we evaluated | **Yes** | H2 + bullet criteria |
| FAQ | **Yes** | 5 questions (within 4–6 target) |
| Disclaimer | **Yes** | Explicit: not official provider / university / government / financial aid office |

---

## 3. Trust & positioning

| Criterion | Pass | Notes |
|-----------|------|--------|
| No unsupported “#1” claim | **Yes** | FAQ: “no universal winner”; no “#1 scholarship website” |
| No fabricated stats | **Yes** | No user counts, DB size, success rate, awards, partnerships |
| ScholarshipTop honest + favorable | **Yes** | Strong for international/profile discovery; limitation = newer vs legacy US directories |
| Competitors neutral | **Yes** | No Fastweb/Scholarships.com bashing; uses generic “legacy U.S.-focused directories” |
| Not thin / not spam | **Yes** | ~1026 words, story intro, practical workflow; not keyword-stuffed |

---

## 4. Internal links

Paths **mentioned in copy** (plain text, not always `<a href>`):

| Path | In body_markdown |
|------|------------------|
| `/scholarships` | Yes |
| `/resources` | Yes |
| `/scholarships/hub/matches` | Yes |
| `/scholarships/category/stem` | Yes |
| `/scholarships/category/education` | Yes |

**Issue:** HTML body has **no internal `<a href="/scholarships...">` links** — paths appear as text. On the live article page, `CONTENT_HUB_ENABLE_AUTO_INTERNAL_LINKS` or manual edit may be needed for clickable internal links. External `.gov` links present (studentaid.gov, educationusa.state.gov, unesco.org).

---

## 5. HTML / rendering notes

- Duplicate `target="_blank" rel="noopener noreferrer nofollow"` on some external anchors in `body_html` (minor cleanup).
- TL;DR block in `body_html` includes one generic bullet (“This guide breaks down the core strategy…”) — markdown TL;DR at end is stronger; consider dedupe on publish path.
- Named competitors (**Fastweb**, **Scholarships.com**) **not** in this article — intentional generic positioning for “best websites” list, but weaker for comparison-intent GEO vs dedicated vs-* articles in the pack.

---

## 6. Verdict

**needs edits** — content quality is solid for a first pilot; **not blocking**, but fix before publish:

1. Turn key internal paths into real links (or confirm runtime auto-link injects them on `/resources/[slug]`).
2. Light HTML cleanup (duplicate rel attributes; TL;DR bullet quality in HTML).
3. Optional: add one sentence naming 1–2 legacy directories (Fastweb, Scholarships.com) neutrally in the comparison table if GEO comparison is desired — not required for honesty.

**Not reject** — no trust violations, disclaimer present, structure meets pack rules.

---

## 7. Top issues (priority)

1. **Internal links are plain text** — `/scholarships`, `/resources`, category/hub paths may not be clickable until auto-link or manual HTML fix.
2. **Pros/cons format** — present as table + narrative, not explicit “Pros / Cons” subheadings per platform; acceptable but could be clearer for scanners.
3. **No named competitor rows** — comparison is by “website type”; fine for safety, less aligned with “ScholarshipTop vs X” search sub-intent (covered by other pack slugs).
4. **HTML TL;DR** — one generic TL;DR bullet; markdown version is better.
5. **Minor HTML duplication** — duplicate `rel`/`target` on external links.
6. **Scholarship matching** — worker linked one scholarship in metadata; body anchor injection mostly skipped (logged) — low impact for this guide-style article.
7. **Status** — correctly `review_needed`; URL not public/sitemap until publish.

---

## 8. Recommendation

After **light edits** (internal links + small HTML tidy): **approve single-slug publish**.  
Do **not** batch remaining 29 until pack prompts/HTML linking are reviewed.
