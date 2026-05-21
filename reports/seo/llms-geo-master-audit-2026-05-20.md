# ScholarshipTop — llms.txt / GEO / AI visibility master audit (2026-05-20)

**Audit only.** No code, commits, or production changes were made.

**Production domain:** `https://scholarshiptop.com`

---

## 1. Executive summary

ScholarshipTop should implement **`/llms.txt`** (compact) and **`/llms-full.txt`** (extended) as **static plain-text files** in `public/`, authored in **English**, with explicit disclaimers that the site is a **scholarship discovery aggregator—not a grant issuer**. The files should reference **sitemap indexes** instead of listing ~40,000 database URLs, document **Stage 2 ES/FR pilot** scope (53 paths per locale), and **exclude** private, API, auth, billing, and product-tool routes.

This is a **low-risk, high-clarity** GEO affordance. It will not replace sitemaps, schema, or trust HTML pages, but it can improve how AI systems describe the brand, choose citations, and warn users to verify official sources.

**Recommendation:** Implement **after ES/FR UI deploy** (or in the same release), with **English-only** llms files; defer localized llms variants until DB translation ships.

---

## 2. Is llms.txt recommended?

**Yes.**

---

## 3. Expected benefits

- Correct entity type (discovery vs provider)
- Safer AI answers (verification, no guarantees)
- Better URL selection (methodology, guides vs `/api/`)
- Clear ES/FR pilot boundaries
- Reduced hallucination of "official partner" or "guaranteed scholarships"

---

## 4. Limitations

- No guaranteed inclusion in LLM training or AI Overviews
- No SEO ranking substitute
- Does not fix English-only DB bodies on localized hubs
- Must be maintained when routes/policies change
- Adoption of `llms.txt` convention is still emerging

---

## 5. SEO / GEO impact

| Area | Impact |
| --- | --- |
| Organic SEO | Neutral to slightly positive (trust alignment); not a ranking factor |
| AI search / GEO | Moderate **clarity** upside; unproven crawl priority |
| Crawl budget | Negligible (two small files) |
| Indexation | May index as text URLs; acceptable |

Details: [llms-geo-strategy-2026-05-20.md](./llms-geo-strategy-2026-05-20.md)

---

## 6. Route / content inventory summary

| Class | Count (approx.) | llms treatment |
| --- | ---: | --- |
| Core + trust + static guides | ~150 EN URLs + 106 ES/FR pilot | Name hubs + examples |
| DB SEO surface | ~40,000 EN | Patterns + sitemap only |
| Private / noindex | ~40 patterns | Strict exclusion |

Full inventory: [llms-geo-route-inventory-2026-05-20.md](./llms-geo-route-inventory-2026-05-20.md) · [CSV](./llms-geo-route-inventory-2026-05-20.csv)

---

## 7. Recommended AI-facing site definition

ScholarshipTop helps students **find and compare scholarships** using organized data (deadlines, eligibility, requirements, providers, essays). It publishes **editorial guides** and **verification methodology**. It is **not** the official scholarship provider, does **not** award funds, and does **not** guarantee acceptance. Users must **verify** amounts, deadlines, and rules on the **official provider site** before applying. Premium subscription may improve matching and tools but does not guarantee outcomes.

---

## 8. Proposed `/llms.txt` content

Full draft: [llms-txt-proposed-content-2026-05-20.md](./llms-txt-proposed-content-2026-05-20.md)

**Sections:** site description · purpose · core pages · content areas · workflows · limitations · languages · recommended pages · exclusions · premium summary · verification policy · sitemaps · freshness · link to full file · contact

---

## 9. Proposed `/llms-full.txt` content

Full draft: [llms-full-txt-proposed-content-2026-05-20.md](./llms-full-txt-proposed-content-2026-05-20.md)

**Adds:** route group tables · scholarship/provider/essay/compare/resource models · localization · IQ subdomain note · SEO coordination · maintenance · DB translation future

---

## 10. Language strategy

**English-only `/llms.txt` + `/llms-full.txt`** with explicit `/es` and `/fr` pilot documentation.

Do **not** ship `/es/llms.txt` or `/llms-fr.txt` in Stage 2 — maintenance and legal sync cost outweigh benefit while DB content remains English.

Revisit localized llms **after** first DB translation batch publishes with sitemap inclusion.

---

## 11. Security / privacy exclusions

Must not appear in llms files:

- `/api/*` (all 62 app API routes)
- `/api/internal/*`, webhooks, cron, billing debug
- `/account`, `/dashboard`, `/signin`, `/onboarding`, `/get-scholarships`
- `/auth/*`, `/subscription/success`
- `/essay`, `/essays/u/*`, tokenized URLs
- Supabase, Lemon, env vars, admin tools

---

## 12. Implementation plan

See [llms-txt-implementation-plan-2026-05-20.md](./llms-txt-implementation-plan-2026-05-20.md)

**Summary:** Add `public/llms.txt`, `public/llms-full.txt`, optional `scripts/seo/check-llms-txt.ts`; do not modify sitemap/robots/DB/auth.

---

## 13. Validation plan

- Build + `curl -I` for 200 and `text/plain`
- Script: forbidden paths, required disclaimers, max size, production URLs only
- Manual legal/product review
- Production smoke after deploy

---

## 14. Maintenance plan

- Update on pilot path registry, policy, or premium changes
- `Last updated` header in file
- CI check on PRs touching `public/llms*.txt`
- Do not list draft DB translations

---

## 15. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Overclaim | Medium | Legal review |
| Private URL leak | High | Automated forbidden-pattern scan |
| Stale locale claims | Medium | English-only llms; path count test |
| False confidence in GEO | Low | Set expectations with stakeholders |

---

## 16. Final recommendation

| Question | Answer |
| --- | --- |
| **Implement now?** | **Yes**, as soon as copy is approved — low effort |
| **After ES/FR deploy?** | **Preferred same window** as Stage 2 UI push so llms language section matches production |
| **Include `/llms-full.txt`?** | **Yes** — link from compact file |
| **Localized llms files?** | **Wait** until DB translation program publishes reviewed bodies |

---

## Deliverables index

| Report | Path |
| --- | --- |
| Route inventory (MD) | [llms-geo-route-inventory-2026-05-20.md](./llms-geo-route-inventory-2026-05-20.md) |
| Route inventory (CSV) | [llms-geo-route-inventory-2026-05-20.csv](./llms-geo-route-inventory-2026-05-20.csv) |
| `/llms.txt` draft | [llms-txt-proposed-content-2026-05-20.md](./llms-txt-proposed-content-2026-05-20.md) |
| `/llms-full.txt` draft | [llms-full-txt-proposed-content-2026-05-20.md](./llms-full-txt-proposed-content-2026-05-20.md) |
| GEO strategy | [llms-geo-strategy-2026-05-20.md](./llms-geo-strategy-2026-05-20.md) |
| Implementation plan | [llms-txt-implementation-plan-2026-05-20.md](./llms-txt-implementation-plan-2026-05-20.md) |
| **This master report** | [llms-geo-master-audit-2026-05-20.md](./llms-geo-master-audit-2026-05-20.md) |

---

## Appendix: Why each master section exists

| Master § | Purpose |
| --- | --- |
| Executive summary | Decision-ready one screen |
| Recommendation | Go/no-go |
| Benefits / limitations | Stakeholder alignment |
| Inventory summary | Scope proof from codebase |
| AI definition | Copy-paste brand truth |
| Drafts | Implementation-ready text |
| Language | Stage 2 i18n alignment |
| Security | Non-negotiable exclusions |
| Plans | Engineering handoff |
| Final table | Answers audit questions 16–17 |
