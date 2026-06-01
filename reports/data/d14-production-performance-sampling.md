# D14 Production Performance Sampling

Date: 2026-06-01  
Base: https://scholarshiptop.com  
Commit at sample time: `a5cb7ba` (pre-D14 footer dedupe)

CSV: `reports/data/d14-production-performance-sampling.csv`

Method: 3 fetches per URL, average/min/max reported.

## Summary

| Route group | Avg ms | Avg KB | Notes |
|---|---:|---:|---|
| State listings (`/scholarships/texas` etc.) | ~2,200 | ~185 | Listing-dominated |
| University listing hubs | ~1,500–16,050 | ~166–180 | CSUN outlier on run 3 |
| Resource (Texas intl) | ~10,836 | 154 | Cold/cache variance |
| Medical guide / career-goals | ~300–340 | 75–108 | Lean |
| Compare university | ~2,907 | 274 | Largest enriched HTML |
| Compare state | ~2,391 | 153 | Moderate |
| Provider (Loyola) | ~1,572 | 297 | Grant table weight |

## Slowest Routes

1. `/scholarships/california/california-state-university-northridge` — avg **16,050 ms** (max 45,742 ms outlier)
2. `/resources/best-scholarships-texas-international-students` — avg **10,836 ms** (max 29,762 ms)
3. `/scholarships/texas` — avg **2,347 ms**
4. `/compare/universities/...` — avg **2,907 ms**, **273.9 KB**

## All Routes PASS (HTTP 200, no bad tokens)

| URL | HTTP | Avg ms | KB | JSON-LD | Link nav | Robots |
|---|---:|---:|---:|---:|---:|---|
| `/scholarships/texas` | 200 | 2,347 | 185.4 | 4 | 2 | noindex, follow |
| `/scholarships/california` | 200 | 2,232 | 185.0 | 4 | 2 | noindex, follow |
| `/scholarships/new-york` | 200 | 2,196 | 185.5 | 4 | 2 | noindex, follow |
| `/scholarships/texas/tarleton-state-university` | 200 | 1,966 | 180.3 | 10 | 2 | index, follow |
| `/scholarships/california/california-state-university-northridge` | 200 | 16,050 | 165.9 | 10 | 2 | index, follow |
| `/resources/best-scholarships-texas-international-students` | 200 | 10,836 | 154.0 | 6 | 2 | none |
| `/resources/medical-scholarships-guide` | 200 | 339 | 108.2 | 6 | 2 | none |
| `/essays/career-goals` | 200 | 300 | 75.2 | 8 | 2 | none |
| `/compare/universities/...` | 200 | 2,907 | 273.9 | 8 | 2 | noindex, follow |
| `/compare/states/california-vs-texas` | 200 | 2,391 | 153.1 | 8 | 2 | noindex, follow |
| `/providers/loyola-university-chicago` | 200 | 1,572 | 297.4 | 12 | 2 | none |

## Payload Finding (pre-fix)

Compare university page had **10** repeated `Reference only` footer strings — nested `DataSourceFooter` in sub-blocks plus section footer. D14 fix consolidates to **1** per page (verified locally post-fix).

## Verdict

**PASS with warnings** — no 500s; latency outliers on listing/resource routes remain; HTML size acceptable but compare/provider pages are heavy.
