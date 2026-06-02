# D17 Provider Gap Audit

Date: 2026-06-01

## Context

D12/D15 smoke showed `/providers/alamo-colleges-foundation` live with **no enrichment block**, while `/providers/loyola-university-chicago` shows school + research context.

D8 added `provider_nonprofit_enrichment.json` (1,293 ProPublica rows) with **strict** matching via `matchProviderToNonprofit()` — returns `null` when:

1. Provider matches a College Scorecard school (school path takes precedence), or
2. Name/state key is ambiguous or absent from static JSON

## Alamo Colleges Foundation finding

| Check | Result |
|---|---|
| Site provider route | `/providers/alamo-colleges-foundation` — HTTP 200 |
| `provider_nonprofit_enrichment.json` | **No** record matching "Alamo Colleges" |
| Customer package ProPublica JSONL | **No** row for "Alamo Colleges Foundation" or "Alamo Colleges District" |
| Root cause | **Source coverage gap**, not just fuzzy-match failure |

**Implication:** Manual QA cannot auto-resolve from existing customer package alone. Options (all require approval):

1. Expand ProPublica collect for missing scholarship foundations
2. Ops-maintained verified override list (EIN + display fields) — **not auto-matched in code without review**
3. Leave page without enrichment (current safe state)

## Match policy (unchanged — do not auto-relax)

```text
Do not implement automatic fuzzy matching in D17.
Propose manual QA workflow only.
```

## Recommended manual QA workflow

1. Export top foundation providers by traffic or scholarship count (from Supabase/analytics — **read-only export outside repo**)
2. For each provider without enrichment, check in order:
   - College Scorecard school match (existing)
   - ProPublica name + state lookup in package
   - IRS EIN lookup external to package if missing
3. Document candidate EIN, official name, state, NTEE, revenue band
4. **Human approves** before any override JSON or pipeline change
5. Re-smoke provider page for visible block + JSON-LD policy

## Coverage stats (static layer)

| Layer | Rows | Typical match |
|---|---:|---|
| School (Scorecard) | 6,197 schools | Universities/colleges on provider pages |
| Nonprofit (ProPublica) | 1,293 orgs | Foundations with exact name/state key |
| Ambiguous keys hidden | 29 documented | Loader suppresses false positives |

## Pages affected

Foundation/community providers without school or nonprofit match show **base provider template only** — no bug, by design.

## D17 recommendation

**Priority:** Manual QA on top 20–50 foundation providers with active scholarships.  
**Do not:** Bulk auto-match or lower strictness without ops review.  
**Investigate:** Whether ProPublica collect scope should include community college foundations (data acquisition task, not site code in D17).

See: `d17-provider-manual-qa-candidates.csv`
