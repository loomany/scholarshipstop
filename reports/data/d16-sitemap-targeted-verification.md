# D16 Sitemap Targeted Verification

Date: 2026-06-01  
Script: `npx tsx scripts/seo/verify-sitemap-priority-urls.ts --prod`  
CSV: `d16-sitemap-targeted-verification.csv`

## Summary

| Result | Count |
|---|---:|
| ok | 7 |
| pending_deploy | 1 (medical guide — code fixed, live sitemap after deploy) |
| fail | 1 (tarleton uni hub — pre-existing, out of D16 scope) |

## Medical guide (D16 fix target)

| Field | Value |
|---|---|
| HTTP | 200 |
| robots | (none) — indexable default |
| canonical | self |
| Live sitemap | **no** (pre-deploy) |
| Code fix | **yes** — will appear in `resources.xml` after deploy |
| result | `pending_deploy` |

## Other indexable priority URLs

| URL | Sitemap bucket | result |
|---|---|---|
| `/essays/career-goals` | essays-0 | ok |
| `/resources/best-scholarships-texas-international-students` | resources | ok |
| `/resources/how-to-find-scholarships` | resources | ok |
| `/resources/best-scholarship-websites` | resources | ok |
| `/providers/loyola-university-chicago` | providers | ok |
| `/scholarships/california/california-state-university-northridge` | seo | ok |

## Noindex pages (policy unchanged)

| URL | robots | In sitemap | result |
|---|---|---|---|
| `/compare/states/california-vs-texas` | noindex, follow | no | ok |
| `/compare/universities/...-south-florida` | noindex, follow | no | ok |

## Note: Tarleton university hub

`/scholarships/texas/tarleton-state-university` is `index, follow` but **not** present as a hub URL in targeted sitemap buckets (only scholarship-detail slugs containing `tarleton-state-university` substring appear in `scholarships-0.xml`). Pre-existing discovery gap — **not fixed in D16** (sitemap policy scope limited to medical/dedicated resource guides).

## Post-deploy check

After deploy, re-run:

```bash
npx tsx scripts/seo/verify-sitemap-priority-urls.ts --prod
```

Expect medical guide: `found_in_sitemap=yes`, `sitemap_bucket=resources`, `result=ok`.
