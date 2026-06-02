# D15 Next 30-Day SEO/GEO Plan

Date: 2026-06-01  
Scope: recommendations only — no policy/code changes without approval

## This week

- [ ] **URL Inspection P1:** `/resources/medical-scholarships-guide`, `/essays/career-goals`, `/providers/loyola-university-chicago`, `/resources/best-scholarships-texas-international-students` — request indexing only if not on Google or stale
- [ ] **Monitor medical guide** — track impressions after Inspection; note sitemap absence
- [ ] **Monitor career-goals essay** — confirm cluster internal links appear in rendered HTML in GSC
- [ ] **Check sitemap inclusion** — confirm medical guide gap; prepare approved fix to add static guide to `resources` or `core` sitemap bucket
- [ ] **GSC access** — add indexing service account to Search Console property OR export Performance manually per checklist
- [ ] **Inspect-only P2:** Texas state listing + two compare detail pages — verify `noindex, follow`, do not request indexing

## Next 2 weeks

- [ ] **Title/meta polish** for pages with impressions but low CTR (once GSC export available) — start with career-goals + texas intl resource
- [ ] **Add visible summaries** on pages Google shows impressions for (intro/lede tuning per D13 pattern)
- [ ] **Fix indexing/canonical mismatches** — only if GSC shows issues; current production canonicals are clean
- [ ] **Sitemap hygiene review** — medical guide inclusion; document why some noindex compare URLs appear in `seo.xml` (policy decision, not D15 change)
- [ ] **Performance watch** — re-sample `/resources/best-scholarships-texas-international-students` and large provider/compare pages for cold-start latency

## Next 30 days

- [ ] **Nursing / pre-med guides** — decide whether to create sibling pages to medical guide based on GSC query data (“nursing scholarships”, “pre-med scholarships”)
- [ ] **City pages** — use Search Console query + state impression data to choose first city targets (Texas/CA metros)
- [ ] **Query-led content** — export top 100 queries (28-day) and map to existing resources/essays vs gaps
- [ ] **Internal link graph** — extend D5 links from medical guide to new guides if created
- [ ] **Compare detail policy** — if UMass-vs-USF gets meaningful impressions while noindex, decide stay-noindex vs quality-gated index (product decision)

## Implementation candidates (require approval — not D15)

| Item | Type | Rationale |
|---|---|---|
| Add medical guide to sitemap | sitemap | Indexable page currently not discoverable via sitemap |
| GSC service account permission | ops | Enable automated D16+ feedback loops |
| Title refresh on texas intl resource | copy/SEO | Meta title still says “2024 Guide” |

## Success metrics (30-day)

- P1 URLs show “URL is on Google” in Inspection
- Medical guide receives first impressions
- CTR improvement on any page with position 5–15 and impressions > 50
- No accidental `noindex` on resource/essay/provider pages
