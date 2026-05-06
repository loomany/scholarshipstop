# Guest browser audit (Stage 1)

- **Generated:** 2026-05-05T23:15:44.784Z
- **BASE_URL:** http://localhost:3001
- **Pages visited:** 9
- **HTTP 200:** 9
- **Pages with scholarship cards:** /, /scholarships, /scholarships/hub/best-matches, /scholarships/hub/easy-apply, /scholarships/hub/international-friendly
- **Pages with lock/blur signals:** /, /scholarships, /scholarships/hub/best-matches, /scholarships/hub/easy-apply, /scholarships/hub/recommended, /scholarships/hub/international-friendly
- **Pages with signup/subscription CTAs:** /, /scholarships, /scholarships/hub/best-matches, /scholarships/hub/easy-apply, /scholarships/hub/recommended, /scholarships/hub/international-friendly, /subscription, /signin, /account
- **Pages with errors (status ≥400 or error hints):** (none)

## Per-page

| Path | Status | Title (truncated) | Cards | Signup CTA | Sub CTA | Lock | Blur | Screenshot |
|------|--------|---------------------|-------|------------|---------|------|------|------------|
| / | 200 | Get Matched With Scholarships in 2 Minutes | 1 | false | true | false | true | `reports\customer-value-audit\screenshots\root.png` |
| /scholarships | 200 | ScholarshipTop / Find Scholarships That Match Your Profile | 9 | false | true | true | true | `reports\customer-value-audit\screenshots\scholarships.png` |
| /scholarships/hub/best-matches | 200 | ScholarshipTop / Find Scholarships | 9 | false | true | true | true | `reports\customer-value-audit\screenshots\scholarships_hub_best-matches.png` |
| /scholarships/hub/easy-apply | 200 | ScholarshipTop / Easy Apply Scholarships | 9 | false | true | true | true | `reports\customer-value-audit\screenshots\scholarships_hub_easy-apply.png` |
| /scholarships/hub/recommended | 200 | ScholarshipTop / Find Scholarships | 0 | false | true | false | true | `reports\customer-value-audit\screenshots\scholarships_hub_recommended.png` |
| /scholarships/hub/international-friendly | 200 | ScholarshipTop / Scholarships for international students | 9 | false | true | true | true | `reports\customer-value-audit\screenshots\scholarships_hub_international-friendly.png` |
| /subscription | 200 | ScholarshipTop / Unlock Premium Precision | 0 | false | true | false | false | `reports\customer-value-audit\screenshots\subscription.png` |
| /signin | 200 | ScholarshipTop / Sign in | 0 | false | true | false | false | `reports\customer-value-audit\screenshots\signin.png` |
| /account | 200 | ScholarshipTop / Sign in | 0 | false | true | false | false | `reports\customer-value-audit\screenshots\account.png` |

## Card samples

Total card rows captured: **36** (see JSON/CSV).

## Overall (heuristic)

Guest flow appears **reachable and mostly healthy** based on status codes and visible error hints. Validate screenshots under `reports/customer-value-audit/screenshots/`.
