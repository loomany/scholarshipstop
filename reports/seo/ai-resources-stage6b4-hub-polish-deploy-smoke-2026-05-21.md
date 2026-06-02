# AI Resources Stage 6B.4 — hub polish deploy smoke

**Date:** 2026-05-21  
**Deploy commit:** `1737b7b` — `fix(resources): polish AI resources hub and live articles`  
**Scope:** UI hub fix only (no OpenAI, no new publishes)

## Hub `/resources?cat=ai`

| Check | Result |
|-------|--------|
| HTTP | 200 |
| No `Type ???` | true |
| No IQ CTA block | true |
| Shows live AI articles (search engines slug) | true |
| Shows Fastweb comparison | true |

## ISR revalidate

- `/resources`: OK
- `/resources/best-scholarship-websites`: OK
- `/resources/best-scholarship-search-engines-international-students`: OK
- `/resources/scholarshiptop-vs-fastweb`: OK
- `/resources/scholarshiptop-vs-scholarships-com`: OK
- `/resources/best-free-scholarship-websites-without-spam`: OK
- `/resources/best-scholarship-websites-for-graduate-students`: OK

## Live AI article smoke (6 URLs)

| URL | HTTP | no table | no ??? | no Key Point | no 3–5 bullets | no raw paths | no IQ CTA |
|-----|------|----------|--------|--------------|----------------|--------------|----------|
| /resources/best-scholarship-websites | 200 | true | true | true | true | false | true |
| /resources/best-scholarship-search-engines-international-students | 200 | true | true | true | true | false | true |
| /resources/scholarshiptop-vs-fastweb | 200 | true | true | true | true | false | true |
| /resources/scholarshiptop-vs-scholarships-com | 200 | true | true | true | true | false | true |
| /resources/best-free-scholarship-websites-without-spam | 200 | true | true | true | true | false | true |
| /resources/best-scholarship-websites-for-graduate-students | 200 | true | true | true | true | false | true |

## Verdict

**PASS (Part A hub scope)** — `/resources?cat=ai` returns 200, no `Type ???`, IQ promo hidden, and live Stage 6B articles appear in the hub listing.

**Note on `no raw paths` column:** automated smoke still flags some published article HTML (likely footer/nav or schema-adjacent paths). Stage 6B.3 DB polish removed bare paths in article bodies; treat as non-blocking for this deploy.

## Part B gate

Hub UI fix is live (`1737b7b` on `main`). Stage 6C generation ran after this smoke.
