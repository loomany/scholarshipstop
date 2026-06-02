# D12 Next Roadmap

Date: 2026-06-01  
Post-audit recommendation after D1–D11

---

## Short-Term, Safe (next 2–4 weeks)

1. **UI polish for strongest pages**
   - Medical guide: tighter hierarchy for planning sections and cluster links
   - Compare state/university detail: ensure source footers visible above fold on mobile
   - Provider school pages: compact metric grid spacing

2. **More visible summaries on medical guide / career-goals**
   - One-sentence “planning takeaway” at top of D11 sections
   - No new data — copy/layout only

3. **Improve state scholarship copy blocks**
   - Turn sidebar metrics into 2–3 plain-language GEO sentences
   - Keep `noindex` policy; improve UX and AI citation clarity

4. **Source/methodology page (if useful)**
   - Consolidate existing `DataSourceFooter` sources into `/scholarship-verification-methodology` or sibling
   - Content-only; no schema policy change

5. **Provider nonprofit match QA**
   - Review top 50 foundation providers without enrichment
   - Manual alias table or ops workflow before code changes

---

## Medium-Term (1–3 months)

1. **City pages or city scholarship context**
   - Only if route strategy approved
   - Reuse D9 `city_rent_metro_enrichment.json` — data ready

2. **Nursing scholarship guide**
   - If editorial content exists or can be drafted
   - Link from medical cluster + `/scholarships/nursing` preset

3. **Pre-med scholarship guide**
   - Fork medical guide shell
   - Use existing `premed_topic_context.json` (9 rows)

4. **Provider/nonprofit manual override workflow**
   - Lightweight JSON or CMS field for verified foundation facts
   - Avoids risky fuzzy matching

5. **Search Console monitoring**
   - Track impressions/clicks on medical guide, career-goals, university scholarship hubs
   - Feed back into copy priorities

---

## Long-Term (3+ months)

1. **Medical/pre-med vertical**
   - Dedicated hub, more topic pages, guarded workforce context on state routes with healthcare intent
   - Still no residency/hospital raw data on general site until vertical launch

2. **More official datasets (fresh recrawls)**
   - After customer package reuse exhausted
   - Scorecard/BLS/HUD refresh pipeline

3. **Supabase/import layer**
   - Only if static JSON becomes limiting (match overrides, editorial flags, provider aliases)
   - Requires explicit approval — out of current guardrails

4. **Search Console feedback loop**
   - Automated weekly digest tied to enriched URL cohorts
   - Correlate with Telegram SEO digest if already running

---

## Explicitly Deferred

| Item | Reason |
|---|---|
| Mass page generation | Policy |
| Canonical/robots/sitemap changes | Out of scope |
| Residency/hospital datasets on general site | Vertical-only |
| Raw customer package in repo | Guardrail |
| New migrations / RLS / Auth / Payments | Hard constraint |

---

## Recommended Immediate Next Step

**Short-term #2 + #3:** Polish visible summaries on `/resources/medical-scholarships-guide` and `/essays/career-goals`, plus plain-language GEO copy on top 5 state scholarship pages (Texas, California, Florida, New York, Illinois). Zero new datasets; highest impact for Google/AI visibility with lowest risk.

---

## Success Metrics (D13+ tracking)

- Medical cluster pages: organic impressions (Search Console)
- State/university enriched pages: time on page + scroll to enrichment block
- Provider pages with enrichment: bounce rate vs without
- TTFB p95 on `/scholarships/[state]` — should not regress
- Static JSON total size — stay under 15 MB unless vertical approved
