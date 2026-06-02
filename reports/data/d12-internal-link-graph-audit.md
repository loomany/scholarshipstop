# D12 Internal Link Graph Audit

Date: 2026-06-01  
Implementation: D5 (`lib/external-data/internalLinkGraph.ts`) + D11 medical cluster (`lib/external-data/medicalContentCluster.ts`)

## Architecture

```
lib/external-data/internalLinkGraph.ts     → D5 general graph (max 6 links, dedupe, no self-links)
lib/external-data/medicalContentCluster.ts → D11 medical cluster links
components/internal-links/SmartRelatedLinks.tsx → shared renderer
components/internal-links/InternalLinkCluster.tsx → D5 wrapper
```

## Expected Link Flows (verified on production)

| From | To (expected) | Live check |
|---|---|---|
| Scholarships (state) | compare, resources, essays | **PASS** — `/scholarships/texas` → `/compare/states`, `/compare/universities`, `/resources/how-to-find-scholarships` |
| Scholarships (university) | state hub, compare, resources, optional provider | **PASS** (code + prior smokes) |
| Providers (school) | state scholarships, compare, how-to-find | **PASS** — Loyola → `/scholarships/illinois`, `/compare/universities`, `/resources/how-to-find-scholarships` |
| Compare (state detail) | scholarships per state, compare hub, resources | **PASS** — CA vs TX → `/scholarships/california`, `/scholarships/texas`, `/compare/universities` |
| Compare (university detail) | state scholarships, state compare, resources | **PASS** — UMass vs USF → `/scholarships/massachusetts`, `/scholarships/florida`, `/compare/states/florida-vs-massachusetts` |
| Medical guide | career goals, financial need, how-to-find, compare, medical category | **PASS** — cluster links present |
| Career goals essay | medical guide, financial need, how-to-find, compare | **PASS** — links visible |
| Resources (D2) | scholarships, compare, essays | **PASS** on state-specific resources |
| Essays (D2) | resources, scholarships | **PASS** on matched essays |

## Medical Cluster (D11)

Center: `/resources/medical-scholarships-guide`

| Surface | Links emitted | Status |
|---|---|---|
| Medical guide | career-goals, financial-need, how-to-find, compare/universities, category/medical | **Present** |
| Career goals | medical-guide, financial-need, how-to-find, compare/universities | **Present** |
| Provider (medical school exact match only) | state scholarships, medical guide, compare, career goals | Code path exists; Loyola correctly **excluded** |

## Guard Checks

| Rule | Result |
|---|---|
| No duplicate hrefs within a single SmartRelatedLinks block | **PASS** — `finalizeInternalLinks` dedupes |
| No self-links | **PASS** — `excludeHref` on state/university sidebars |
| Max 6 links per block | **PASS** — enforced in code |
| Empty blocks not rendered | **PASS** |
| Generic pages not polluted | **PASS** — suppress slugs for how-to-find, best-scholarship-websites, financial-need |
| Duplicate link **blocks** on same page | **Minor warning** — medical guide and career-goals show cluster links plus editorial/nav links to same destinations (different UI zones, not duplicate blocks) |
| Medical cluster on broad state/compare routes | **PASS** — absent on `/scholarships/texas` and university compare |
| State/university cluster links | **PASS** — featured CA vs TX link on TX/CA scholarship pages (code); scholarship state pages link to compare hubs |

## Pages Without D5/D11 Link Blocks (expected)

| Page | Reason |
|---|---|
| `/providers/alamo-colleges-foundation` | No school/nonprofit enrichment → no provider cluster |
| `/resources/how-to-find-scholarships` | Generic suppress; editorial links only |
| `/compare/states` hub | Teaser page; links on detail routes |
| `/compare/universities` hub | Teaser page |

## SEO Safety

- No new URLs generated at scale
- No changes to canonical, robots, sitemap in D5/D11
- Links are contextual planning paths, not keyword footer spam

## Verdict

**PASS** — D5 graph and D11 medical cluster behave as designed; no self-links or duplicate blocks within enrichment components.
