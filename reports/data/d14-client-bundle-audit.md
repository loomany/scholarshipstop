# D14 Client Bundle Audit

Date: 2026-06-01

## Static JSON Import Surface

| File | Role |
|---|---|
| `lib/external-data/loadStaticEnrichment.ts` | **Only** direct JSON importer (`import 'server-only'`) |
| All 11 enrichment JSON files | Imported here only |

## Client Component Check

| Check | Result |
|---|---|
| `'use client'` components importing `@/lib/external-data` loaders | **None found** |
| `scholarshiptop-enrichment` in `.next/static/chunks/*.js` | **None found** |
| 10.58 MB static layer in client bundle | **No** |

## Build First Load JS (unchanged by D14)

| Route | First Load JS |
|---|---:|
| `/scholarships/[[...slugPath]]` | 458 kB |
| `/providers/[id]` | 329 kB |
| `/resources/[slug]` | 323 kB |
| `/essays/[slug]` | 323 kB |
| `/compare/universities/[slug]` | 321 kB |
| `/compare/states/[slug]` | 247 kB |
| Shared baseline | 87.7 kB |

D14 changes are server-rendered copy/footer only — **no client bundle size change expected**.

## Component Import Pattern

Enrichment UI components (`components/data-viz/*`, `components/scholarships/*`, etc.) import:

- **Types only** from `@/lib/external-data` (tree-shaken, no JSON)
- **Resolved data via props** from server parents
- **Link helpers** from `internalLinkGraph` / `medicalContentCluster` (no JSON)

## Verdict

**PASS** — static enrichment remains server-only; client bundle not inflated by JSON layer.
