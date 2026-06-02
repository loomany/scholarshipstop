# Stage 4D — `resource_article` field translation map (2026-05-21)

**Source table:** `public.content_posts`  
**Translation store:** `public.content_translations` with `source_type = 'resource_article'` and `source_id = content_posts.id` (UUID).

---

## Translate (ES/FR)

| EN source field | `content_translations` column | Notes |
| --- | --- | --- |
| `title` | `translated_title` | Page H1 / visible headline |
| `meta_title` | `translated_meta_title` | Falls back to `title` in EN metadata |
| `meta_description` | `translated_meta_description` | SERP snippet |
| Excerpt / deck (if used) | `translated_summary` | Short intro above body or card teaser on localized hub |
| `body_html` | `translated_body` | Full HTML after EN pipeline concepts: preserve structure, `h2`/`h3` ids, CTAs |
| Headings inside body | Part of `translated_body` | Do not strip heading tags |
| `faq` JSON | `translated_faq_json` | Array `{ question, answer }`; merge policy same as EN (inline FAQ stays in body or split — **match EN behavior**) |
| JSON-LD text derived at render | `translated_schema_json` | Optional localized `headline` / `description` for `BlogPosting` + `FAQPage` if not rebuilt from translated fields only |
| Section labels, CTA copy, TOC labels | `translated_extra_json` | e.g. “Back to Resources”, “FAQ”, mid-article CTA strings, breadcrumb segment names |
| Helper / disclaimer blocks | `translated_body` or `translated_extra_json` | Keep financial-aid / official-source disclaimer equivalent |

---

## Do NOT translate

| Field / concept | Reason |
| --- | --- |
| `slug` | English slug under `/es/resources/{slug}` and `/fr/resources/{slug}` for pilot |
| `id`, `status`, dates (`published_at`, `updated_at`) | System |
| Official scholarship **names**, provider **display names** | Proper nouns |
| Dollar **amounts**, **deadline dates**, award years in factual tables | Factual preservation |
| `cover_image_url`, asset URLs | Media |
| `primary_keyword` (EN SEO ops) | Internal |
| Category taxonomy IDs | `resourceTaxonomy` keys stay EN |
| UTM / tracking params | Analytics |
| Internal link **paths** unless target has published translation | Link policy (see quality gates) |
| `apply` / external official URLs | Leave hrefs unchanged |

---

## Risky content (human review required)

Flag in `reviewer_notes` / `blocked_reason` when detected:

- Claims of **guaranteed** awards or acceptance rates
- **Exact eligibility** rules copied without EN source backing
- **Tax / legal / immigration** advice beyond general disclaimers
- **Deadline calendars** tied to a specific year or month (stale risk)
- **Provider-specific** facts (address, phone, fee) — must match EN source
- Statistics without source in EN article
- Instructions to send **passport / SSN / payment** — extra scam-safety review

---

## `source_hash` inputs (staleness)

Hash stable EN fields on publish:

`title`, `meta_title`, `meta_description`, `body_html`, `faq`, `updated_at` (or content revision id if added later).

When EN changes → mark ES/FR `stale` until re-reviewed.

---

## Mapping vs category pilot

Category pilot used heavy `translated_extra_json` for listing UI. Resources need **`translated_body` (HTML)** as primary payload plus FAQ JSON; listing cards on hub may use `translated_title` + `translated_summary` only until full hub localization.
