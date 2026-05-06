# Cross-country SEO — implementation report (Step 1.1)

**Generated:** 2026-05-06T00:08:55.891Z  
**Source preview:** docs/seo-cross-country-preview.json (preview at 2026-05-05T23:50:59.197Z)

**Policy:** Germany index/sitemap only for allowlist pairs (GB, IN, CA, US, MX, PH → DE) with count ≥ 20 and auto-QA pass. All other DE → `manual_review`, noindex, not in sitemap. Domestic pairs (applicant = host) → `allowedForAds: false` + note `domestic_pair_not_primary_ads`.

## Summary

| Metric | Count |
|--------|------:|
| Total manifest entries | 308 |
| Skipped from preview (count < 5) | 0 |
| Indexable total (`robots: index,follow`) | 28 |
| Sitemap total (`includeInSitemap: true`) | 28 |
| Noindex (`robots: noindex,follow`) | 280 |
| `manual_review` (all hosts) | 131 |
| `approved_priority` | 15 |
| `approved` | 13 |
| `published_noindex` | 149 |

## Germany cluster (host DE)

| Metric | Count |
|--------|------:|
| Germany total | 137 |
| Germany indexable | 6 |
| Germany noindex | 131 |
| Germany `manual_review` | 131 |

Allowlist for index (applicant-host): `GB-DE`, `IN-DE`, `CA-DE`, `US-DE`, `MX-DE`, `PH-DE`. All DE rows: `allowedForAds: false`.

## Domestic pairs (applicantCode === hostCode)

| Metric | Count |
|--------|------:|
| Domestic pairs total | 23 |
| Domestic indexable | 6 |

All domestic pairs: `allowedForAds: false`, `qaNotes` includes `domestic_pair_not_primary_ads`.

## Top 20 indexable URLs (by `totalCountSnapshot`)

| # | Count | URL | Status |
|---|------:|-----|--------|
| 1 | 8983 | `/scholarships/for-students-from/united-states/study-in/united-states` | approved_priority |
| 2 | 182 | `/scholarships/for-students-from/canada/study-in/canada` | approved_priority |
| 3 | 170 | `/scholarships/for-students-from/united-kingdom/study-in/united-kingdom` | approved_priority |
| 4 | 150 | `/scholarships/for-students-from/canada/study-in/united-states` | approved_priority |
| 5 | 117 | `/scholarships/for-students-from/united-states/study-in/germany` | approved_priority |
| 6 | 96 | `/scholarships/for-students-from/philippines/study-in/germany` | approved_priority |
| 7 | 95 | `/scholarships/for-students-from/united-kingdom/study-in/germany` | approved_priority |
| 8 | 94 | `/scholarships/for-students-from/mexico/study-in/germany` | approved_priority |
| 9 | 90 | `/scholarships/for-students-from/india/study-in/germany` | approved_priority |
| 10 | 88 | `/scholarships/for-students-from/canada/study-in/germany` | approved_priority |
| 11 | 81 | `/scholarships/for-students-from/mexico/study-in/united-states` | approved_priority |
| 12 | 70 | `/scholarships/for-students-from/united-kingdom/study-in/united-states` | approved_priority |
| 13 | 66 | `/scholarships/for-students-from/new-zealand/study-in/new-zealand` | approved_priority |
| 14 | 65 | `/scholarships/for-students-from/united-states/study-in/canada` | approved_priority |
| 15 | 64 | `/scholarships/for-students-from/australia/study-in/australia` | approved_priority |
| 16 | 49 | `/scholarships/for-students-from/india/study-in/united-states` | approved |
| 17 | 46 | `/scholarships/for-students-from/italy/study-in/united-states` | approved |
| 18 | 39 | `/scholarships/for-students-from/india/study-in/india` | approved |
| 19 | 38 | `/scholarships/for-students-from/united-states/study-in/united-kingdom` | approved |
| 20 | 29 | `/scholarships/for-students-from/sao-tome-principe/study-in/united-states` | approved |

## Top Google Ads URLs (`approved_priority` + sitemap + `allowedForAds` + host US/GB/CA/AU)

| # | Count | URL |
|---|------:|-----|
| 1 | 150 | `/scholarships/for-students-from/canada/study-in/united-states` |
| 2 | 81 | `/scholarships/for-students-from/mexico/study-in/united-states` |
| 3 | 70 | `/scholarships/for-students-from/united-kingdom/study-in/united-states` |
| 4 | 65 | `/scholarships/for-students-from/united-states/study-in/canada` |

## Example manifest entries (JSON excerpts)

### 1. `approved_priority` (sample)

```json
{
  "applicantCode": "US",
  "hostCode": "US",
  "applicantSlug": "united-states",
  "hostSlug": "united-states",
  "canonicalPath": "for-students-from/united-states/study-in/united-states",
  "href": "/scholarships/for-students-from/united-states/study-in/united-states",
  "h1": "Scholarships for American Students to Study in the USA",
  "metaTitle": "American Students: Scholarships to Study in the USA | ScholarshipTop",
  "metaDescription": "Find scholarships for students from United States who want to study in United States. Compare deadlines, award amounts, eligibility notes, and requirements before applying.",
  "intro": "Explore scholarships that list United States as an eligible applicant country and United States as the study destination. Compare award amounts, deadlines, requirements, and eligibility notes before opening the official application page.",
  "faqQuestions": [
    "Are there scholarships for students from United States to study in United States?",
    "Can American students apply for scholarships in United States?",
    "What should I compare before applying?",
    "Do I need to write an essay for these scholarships?",
    "How do I know if I’m eligible?"
  ],
  "totalCountSnapshot": 8983,
  "tier": "priority_candidate",
  "qaStatus": "auto_pass",
  "duplicateRisk": "medium_intent_overlap_with_hub_filtered_urls_hub_queries_are_typically_noindex_cross_country_path_not_implemented_yet_unique_when_launched",
  "unspecifiedRisk": "low_strict_pair_from_nonempty_host_codes",
  "status": "approved_priority",
  "robots": "index,follow",
  "includeInSitemap": true,
  "allowedForAds": false,
  "enabled": true,
  "qaNotes": "domestic_pair_not_primary_ads"
}
```

### 2. `approved` (sample)

```json
{
  "applicantCode": "IN",
  "hostCode": "US",
  "applicantSlug": "india",
  "hostSlug": "united-states",
  "canonicalPath": "for-students-from/india/study-in/united-states",
  "href": "/scholarships/for-students-from/india/study-in/united-states",
  "h1": "Scholarships for Indian Students to Study in the USA",
  "metaTitle": "Indian Students: Scholarships to Study in the USA | ScholarshipTop",
  "metaDescription": "Find scholarships for students from India who want to study in United States. Compare deadlines, award amounts, eligibility notes, and requirements before applying.",
  "intro": "Explore scholarships that list India as an eligible applicant country and United States as the study destination. Compare award amounts, deadlines, requirements, and eligibility notes before opening the official application page.",
  "faqQuestions": [
    "Are there scholarships for students from India to study in United States?",
    "Can Indian students apply for scholarships in United States?",
    "What should I compare before applying?",
    "Do I need to write an essay for these scholarships?",
    "How do I know if I’m eligible?"
  ],
  "totalCountSnapshot": 49,
  "tier": "candidate_after_QA",
  "qaStatus": "auto_pass",
  "duplicateRisk": "medium_intent_overlap_with_hub_filtered_urls_hub_queries_are_typically_noindex_cross_country_path_not_implemented_yet_unique_when_launched",
  "unspecifiedRisk": "low_strict_pair_from_nonempty_host_codes",
  "status": "approved",
  "robots": "index,follow",
  "includeInSitemap": true,
  "allowedForAds": false,
  "enabled": true,
  "qaNotes": "ads_optional_after_manual_QA"
}
```

### 3. `published_noindex` (sample)

```json
{
  "applicantCode": "US",
  "hostCode": "CD",
  "applicantSlug": "united-states",
  "hostSlug": "congo-kinshasa",
  "canonicalPath": "for-students-from/united-states/study-in/congo-kinshasa",
  "href": "/scholarships/for-students-from/united-states/study-in/congo-kinshasa",
  "h1": "Scholarships for American Students to Study in Congo - Kinshasa",
  "metaTitle": "American Students: Scholarships to Study in Congo - Kinshasa | ScholarshipTop",
  "metaDescription": "Find scholarships for students from United States who want to study in Congo - Kinshasa. Compare deadlines, award amounts, eligibility notes, and requirements before applying.",
  "intro": "Explore scholarships that list United States as an eligible applicant country and Congo - Kinshasa as the study destination. Compare award amounts, deadlines, requirements, and eligibility notes before opening the official application page.",
  "faqQuestions": [
    "Are there scholarships for students from United States to study in Congo - Kinshasa?",
    "Can American students apply for scholarships in Congo - Kinshasa?",
    "What should I compare before applying?",
    "Do I need to write an essay for these scholarships?",
    "How do I know if I’m eligible?"
  ],
  "totalCountSnapshot": 19,
  "tier": "low_count_noindex",
  "qaStatus": "auto_fail",
  "duplicateRisk": "medium_intent_overlap_with_hub_filtered_urls_hub_queries_are_typically_noindex_cross_country_path_not_implemented_yet_unique_when_launched",
  "unspecifiedRisk": "low_strict_pair_from_nonempty_host_codes",
  "status": "published_noindex",
  "robots": "noindex,follow",
  "includeInSitemap": false,
  "allowedForAds": false,
  "enabled": true,
  "qaNotes": "low_volume_5_19_bucket"
}
```

### 4. `manual_review` (sample)

```json
{
  "applicantCode": "UA",
  "hostCode": "DE",
  "applicantSlug": "ukraine",
  "hostSlug": "germany",
  "canonicalPath": "for-students-from/ukraine/study-in/germany",
  "href": "/scholarships/for-students-from/ukraine/study-in/germany",
  "h1": "Scholarships for Students from Ukraine to Study in Germany",
  "metaTitle": "Students from Ukraine: Scholarships to Study in Germany | ScholarshipTop",
  "metaDescription": "Find scholarships for students from Ukraine who want to study in Germany. Compare deadlines, award amounts, eligibility notes, and requirements before applying.",
  "intro": "Explore scholarships that list Ukraine as an eligible applicant country and Germany as the study destination. Compare award amounts, deadlines, requirements, and eligibility notes before opening the official application page.",
  "faqQuestions": [
    "Are there scholarships for students from Ukraine to study in Germany?",
    "Can students from Ukraine apply for scholarships in Germany?",
    "What should I compare before applying?",
    "Do I need to write an essay for these scholarships?",
    "How do I know if I’m eligible?"
  ],
  "totalCountSnapshot": 102,
  "tier": "priority_candidate",
  "qaStatus": "auto_fail",
  "duplicateRisk": "medium_intent_overlap_with_hub_filtered_urls_hub_queries_are_typically_noindex_cross_country_path_not_implemented_yet_unique_when_launched",
  "unspecifiedRisk": "low_strict_pair_from_nonempty_host_codes",
  "status": "manual_review",
  "robots": "noindex,follow",
  "includeInSitemap": false,
  "allowedForAds": false,
  "enabled": true,
  "qaNotes": "germany_cluster_manual_review; not_on_germany_index_allowlist"
}
```

## Artifacts

- [`data/seo-cross-country-routes.json`](data/seo-cross-country-routes.json)
- This file: [`docs/seo-cross-country-implementation-report.md`](docs/seo-cross-country-implementation-report.md)

Step 2 (resolver, SSR, metadata, sitemap, UI, tests) is **not** included in Step 1.
