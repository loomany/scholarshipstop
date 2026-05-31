# Stage C4.1 preflight

**Date:** 2026-05-31  
**Stage:** C4.1 — fix state affordability sidebar gap on alternate state routes

---

## Current HEAD

```
9d8b62b feat(scholarships): add static affordability sidebars
```

---

## C4 smoke gap (production, pre-fix)

| URL | State sidebar | Notes |
|-----|---------------|-------|
| `/scholarships/california` | **Yes** | Promoted state-hub chrome + sidebar |
| `/scholarships/texas` | **No** | Lighter listing (~40 KB), `leadContent={null}` |
| `/scholarships/new-york` | **No** | Same lighter template |
| `/scholarships/texas/tarleton-state-university` | N/A (school card) | **Pass** |
| `/scholarships/california/california-state-university-northridge` | N/A (school card) | **Pass** |

Verdict: **PASS with gap** — see `stage-c4-post-deploy-smoke.md`.

---

## Preflight commands

| Command | Result |
|---------|--------|
| `git log --oneline -8` | OK — HEAD `9d8b62b` |
| `git status --short` | Many unrelated dirty/untracked files (i18n, SEO reports, `.env*`, content drafts) — **out of scope** |
| `npm run data:validate-enrichment` | **PASS** (2 documented WARNs) |

---

## Planned scope (C4.1)

**In scope:**

- `app/scholarships/scholarshipsSlugPathPageBody.tsx`
- `lib/external-data/scholarshipPageEnrichment.ts`
- `lib/external-data/index.ts`
- `reports/data/stage-c4-1-*.md`

**Explicitly not changing:**

- Supabase schema / RLS / Auth / Payments
- robots / canonical / noindex / sitemap
- scholarship ranking / listing queries
- university sidebar logic (`UniversityHubPageContent.tsx`)
- unrelated dirty files

**SEO policy changed planned:** **no**
