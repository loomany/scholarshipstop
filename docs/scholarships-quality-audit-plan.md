# Scholarships / grants catalog — quality audit plan

Read-only audit for `public.scholarships` (~17k rows). **No DELETE/UPDATE**, no RLS changes, no payment/auth changes.

## 1. Schema (from `types_db.ts` + migrations)

| Role | Column |
|------|--------|
| Primary key | `id` (uuid, text in TS) |
| Title | `title` |
| Description | `description`, also `summary_short`, `summary_long` |
| Provider | `provider_name`, `provider_url`, `official_source_name` |
| Amount | `award_amount_text`, `award_amount_min`, `award_amount_max` |
| Deadline | `deadline_text`, `deadline_date` |
| URLs | `url`, `apply_url` |
| Eligibility (long text) | `eligibility_text`, `requirements_text`, … |
| Category | `category`, `category_slug` |
| Source / ingest | `source`, `source_id` |
| Listing flags | `is_active`, `is_indexable`, `scholarship_status` |
| Dedupe hint | `text_fingerprint`, `slug` |
| Timestamps | `created_at`, `updated_at`, `last_seen_at` |

**View (public listing API):** `scholarships_safe_listing` — subset for clients. **Audits use the base table** `scholarships` for full fields.

## 2. Artifacts

| File | Purpose |
|------|---------|
| `scripts/audit-scholarships-quality.sql` | Run in Supabase SQL editor or `psql` (read-only SELECT). |
| `scripts/audit-scholarships-quality.ts` | Full heuristic audit + CSV/JSON under `reports/scholarships-quality/`. |
| `reports/scholarships-quality/*` | Generated outputs (git-optional; may be large). |

## 3. Run commands

```bash
# Recommended (loads .env.local)
npm run scholarships:audit-quality

# Or
dotenv -e .env.local -- npx tsx scripts/audit-scholarships-quality.ts
```

**Env:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (same as other service scripts). Read-only usage only.

**Optional URL reachability (slow):**

```bash
dotenv -e .env.local -- npx tsx scripts/audit-scholarships-quality.ts --check-urls
```

## 4. Outputs

| File | Contents |
|------|----------|
| `summary.json` | Counts, buckets, top sources, top manual-review IDs |
| `duplicates-exact.csv` | Rows in duplicate groups (normalized keys) |
| `duplicates-near.csv` | Blocked similarity pairs (Jaccard + optional Levenshtein) |
| `suspicious-non-scholarships.csv` | Anti-keyword / low-relevance heuristics |
| `weak-content.csv` | Short title/description, parser junk, missing fields |
| `expired.csv` | `deadline_date` in the past (and related flags) |
| `source-quality.csv` | Per-`source` aggregates |
| `manual-review-top-200.csv` | Lowest `quality_score` rows + reasons |
| `url-status.csv` | Only with `--check-urls` |

## 5. Quality score (0–100)

Heuristic penalties (see TS): missing title, short title, missing/short description, missing provider/URL/deadline, expired, no positive grant keywords, anti-keywords, exact/near duplicate hints, garbage phrases.

**Bands:** 80–100 good · 60–79 ok · 40–59 needs review · 0–39 likely trash.

## 6. Near-duplicate strategy

- **No full N×N.** Blocking keys: `source` + first 5 normalized words (after stop-word removal); secondary pass by normalized title prefix.
- **Similarity:** word-set Jaccard; for candidates with Jaccard ≥ ~0.65, optional normalized-string Levenshtein ratio on short titles.
- Output capped (see script constants) to avoid enormous CSVs.

## 7. AI classification — planned only (not implemented)

**When:** After heuristics, if many rows sit in 40–70 score or ambiguous near-duplicates.

**Candidate rows:** `quality_score` 40–70, top suspicious by anti-keywords, near-duplicate clusters.

**Suggested labels:** `real_scholarship`, `grant`, `fellowship`, `financial_aid`, `not_scholarship`, `spam_trash`, `uncertain`.

**Do not** enable paid AI calls without explicit approval.

## 8. SQL vs TypeScript

- **SQL:** Fast cohort counts, duplicate group sizes, null ratios — good for dashboards.
- **TS:** Keyword/ant-keyword lists, scoring, blocking near-duplicates, CSV exports, optional HTTP checks.

## 9. Safety

- No migrations, no `UPDATE`/`DELETE`, no auth/Stripe/Lemon code paths.
- Service role is used **only for SELECT** in this script.

## 10. Interpreting outputs (after you run the script)

Use `summary.json` for headline metrics; CSVs for spreadsheets.

**Likely merges:** rows sharing `duplicate_key` in `duplicates-exact.csv` (`norm_title`, `primary_url`, `title_provider`, …).

**Likely trash:** `likely_trash` bucket + `suspicious-non-scholarships.csv` — validate manually before any deletion.

**Sources to review:** `top_20_worst_sources` in `summary.json` and `source-quality.csv` — high `suspicious_count` / low `quality_score_avg` suggests parser or upstream feed issues.

**Field gaps:** `weak-content.csv` and `missing_*` counts — prioritize backfills for high-traffic listings only.

**URL health:** optional `--check-urls` → `url-status.csv`; many `404`/`timeout` on one domain implies broken crawler seeds.

### AI follow-up (future)

See §7 — run only on `manual-review-top-200.csv` and mid-score bands after heuristics stabilize.
