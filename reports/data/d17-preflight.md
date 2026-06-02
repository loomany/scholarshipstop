# D17 Preflight

Date: 2026-06-01  
Stage: Second-Pass Customer Data Reuse Audit (audit-only)

## Current HEAD

```
4ad9a8c fix(seo): include medical scholarship guide in sitemap
```

## D16 status

**Committed and pushed** to `origin/main` (`4ad9a8c`). Post-deploy smoke **PASS** (medical guide live in `resources.xml`).

Local dirty (unrelated): `reports/data/d16-sitemap-targeted-verification.csv` modified by verification script re-run — **not part of D17, not staged**.

## D1–D16 live stack

D1 charts, D2 contextual links, D5 internal link graph, D6 JSON-LD, D8 provider/research/social, D9 city rent/metro, D10 medical layer, D11 medical cluster, D12 impact audit, D13 GEO copy, D14 payload cleanup, D15 indexing audit, D16 sitemap fix.

## Dirty unrelated files (do not touch)

- `lib/i18n/*` (modified)
- `reports/seo/*` (modified)
- `data/content/*` (untracked)
- `.env.local.bak-*` (untracked)
- Various untracked reports/scripts outside D17 scope

## D17 scope

**Audit-only** — no code changes, no new JSON outputs, no commit, no push.

Reports only under `reports/data/d17-*`.
