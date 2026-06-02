# D18 Preflight

Date: 2026-06-01  
Stage: GSC Ops + Query-Led SEO Feedback Loop (audit/ops only)

## Current HEAD

```
4ad9a8c fix(seo): include medical scholarship guide in sitemap
```

## D16 status

**PASS** — production verified:

- `/resources/medical-scholarships-guide` → HTTP 200, self-canonical, no noindex
- `found_in_sitemap=yes`, `sitemap_bucket=resources`
- Rollback needed: **no**

## GSC access status

**Blocked (403)** — service account lacks permission on `https://scholarshiptop.com/`

Attempted: `dotenv -e .env.local -- npx tsx reports/data/_d18-gsc-pull.ts`  
Result: same 403 as D15/D16. Manual export checklist required.

## D18 scope

**Audit/ops only** — no code changes, no commit, no push.

Deliverables: `reports/data/d18-*` only.

## Dirty unrelated files

Pre-existing local modifications (`lib/i18n/*`, `reports/seo/*`, etc.) — **not touched**.
