# D15 Production Technical Checks

Date: 2026-06-01  
Base: https://scholarshiptop.com  
Production commit: `b50e801`  
CSV: `reports/data/d15-production-technical-checks.csv`

## Verdict

**PASS with warnings** — all priority URLs return HTTP 200 with correct robots/canonical policy; warnings on sitemap gap (medical guide), HTML payload size, intermittent latency, and raw-HTML token false positives.

## Summary table

| Metric | Result |
|---|---|
| URLs checked | 19 |
| HTTP 200 | 19 / 19 |
| Wrong robots vs policy | 0 |
| Wrong canonical | 0 |
| Missing title / meta description | 0 |
| Missing JSON-LD | 0 |
| Visible bad tokens (undefined/null/NaN) | 0 (see note) |
| Self-canonical | 19 / 19 |

## Robots / indexability (matches policy)

| Group | Expected | Observed |
|---|---|---|
| Resources / essays / providers / compare hubs | index (default) | ✓ no accidental `noindex` |
| State scholarship listings | `noindex, follow` | ✓ 5/5 |
| Compare detail pages | `noindex, follow` | ✓ 2/2 |
| University scholarship hubs | `index, follow` | ✓ 2/2 |

## JSON-LD

| Page type | JSON-LD blocks |
|---|---:|
| Resource | 6–8 |
| Essay | 8 |
| State listing | 4 |
| University hub | 10 |
| Compare hub | 6 |
| Compare detail | 8 |
| Provider | 10–12 |

All pages have structured data present post-D6.

## Context / enrichment visibility

All pages show expected D1–D14 enrichment except `/compare/universities` hub — automated pattern did not match page copy (“University vs University” title present; enrichment blocks load). Treat as **PASS** on manual review.

## Bad tokens note

CSV flags `undefined` and `null` in raw HTML on all pages. D14 smoke confirmed **no visible** user-facing tokens. Matches are in Next.js hydration/JSON payloads — **false positive**, not a regression.

## Performance / payload

| URL | HTML KB | Response ms | Note |
|---|---:|---:|---|
| `/resources/medical-scholarships-guide` | 105.7 | 351 | OK |
| `/essays/career-goals` | 74.7 | 189 | OK |
| `/resources/best-scholarships-texas-international-students` | 152.6 | **30,902** | Cold-start spike; re-test ~0.3–32s in D14 |
| `/scholarships/texas` | 183.8 | 3,186 | Large listing HTML |
| `/compare/universities/...-south-florida` | **269.4** | 2,827 | Largest payload; D14 footer deduped |
| `/providers/loyola-university-chicago` | **294.9** | 1,967 | Heavy provider enrichment |
| `/providers/alamo-colleges-foundation` | 281.4 | 2,051 | Heavy provider enrichment |

Warnings: state listing pages ~183 KB each; provider/compare detail pages 150–295 KB. No critical render bugs observed.

## Title / meta samples

- Medical guide: “Medical Scholarships Guide for Healthcare Students” — meta present
- Career goals essay: “How to Write a Career Goals Scholarship Essay” — meta present
- Texas state: branded title + meta present (`noindex`)
- Tarleton uni hub: long branded title + `index, follow`

## Recommended follow-ups (report only — no code in D15)

1. Add `/resources/medical-scholarships-guide` to sitemap (indexable static page currently absent).
2. Monitor GSC after manual URL Inspection on P1 URLs.
3. Track latency on Texas intl resource and large compare/provider pages.
