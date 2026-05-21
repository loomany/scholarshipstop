# i18n language-switcher audit (2026-05-19)

Base URL: http://localhost:3020

Pages audited: 51
Pages expecting switcher: 51
Pages passing switcher checks: 45
Pages with blocking switcher issues: 6
Pages intentionally English-only (switcher hidden): 0

## Blocking switcher issues

- http://localhost:3020/essays
  - HTTP 500
  - expected: en=`/essays`, es=`/es/essays`, fr=`/fr/essays`
  - actual: en=`/essays` (active), es=`/es/essays`, fr=`/fr/essays`
- http://localhost:3020/es/essays
  - HTTP 500
  - expected: en=`/essays`, es=`/es/essays`, fr=`/fr/essays`
  - actual: en=`/essays`, es=`/es/essays` (active), fr=`/fr/essays`
- http://localhost:3020/fr/essays
  - HTTP 500
  - expected: en=`/essays`, es=`/es/essays`, fr=`/fr/essays`
  - actual: en=`/essays`, es=`/es/essays`, fr=`/fr/essays` (active)
- http://localhost:3020/resources
  - HTTP 500
  - expected: en=`/resources`, es=`/es/resources`, fr=`/fr/resources`
  - actual: en=`/resources` (active), es=`/es/resources`, fr=`/fr/resources`
- http://localhost:3020/es/resources
  - HTTP 500
  - expected: en=`/resources`, es=`/es/resources`, fr=`/fr/resources`
  - actual: en=`/resources`, es=`/es/resources` (active), fr=`/fr/resources`
- http://localhost:3020/fr/resources
  - HTTP 500
  - expected: en=`/resources`, es=`/es/resources`, fr=`/fr/resources`
  - actual: en=`/resources`, es=`/es/resources`, fr=`/fr/resources` (active)

## Translated cluster pages — passing

- http://localhost:3020/ — active: `en` → `/`
- http://localhost:3020/es — active: `es` → `/es`
- http://localhost:3020/fr — active: `fr` → `/fr`
- http://localhost:3020/scholarships — active: `en` → `/scholarships/hub/best-recommendation`
- http://localhost:3020/es/scholarships — active: `es` → `/es/scholarships/hub/best-recommendation`
- http://localhost:3020/fr/scholarships — active: `fr` → `/fr/scholarships/hub/best-recommendation`
- http://localhost:3020/scholarships/hub/best-recommendation — active: `en` → `/scholarships/hub/best-recommendation`
- http://localhost:3020/es/scholarships/hub/best-recommendation — active: `es` → `/es/scholarships/hub/best-recommendation`
- http://localhost:3020/fr/scholarships/hub/best-recommendation — active: `fr` → `/fr/scholarships/hub/best-recommendation`
- http://localhost:3020/scholarships/hub/easy-apply — active: `en` → `/scholarships/hub/easy-apply`
- http://localhost:3020/es/scholarships/hub/easy-apply — active: `es` → `/es/scholarships/hub/easy-apply`
- http://localhost:3020/fr/scholarships/hub/easy-apply — active: `fr` → `/fr/scholarships/hub/easy-apply`
- http://localhost:3020/scholarships/hub/hot-deadlines — active: `en` → `/scholarships/hub/hot-deadlines`
- http://localhost:3020/es/scholarships/hub/hot-deadlines — active: `es` → `/es/scholarships/hub/hot-deadlines`
- http://localhost:3020/fr/scholarships/hub/hot-deadlines — active: `fr` → `/fr/scholarships/hub/hot-deadlines`
- http://localhost:3020/scholarships/hub/international-friendly — active: `en` → `/scholarships/hub/international-friendly`
- http://localhost:3020/es/scholarships/hub/international-friendly — active: `es` → `/es/scholarships/hub/international-friendly`
- http://localhost:3020/fr/scholarships/hub/international-friendly — active: `fr` → `/fr/scholarships/hub/international-friendly`
- http://localhost:3020/providers — active: `en` → `/providers`
- http://localhost:3020/es/providers — active: `es` → `/es/providers`
- http://localhost:3020/fr/providers — active: `fr` → `/fr/providers`
- http://localhost:3020/compare — active: `en` → `/compare`
- http://localhost:3020/es/compare — active: `es` → `/es/compare`
- http://localhost:3020/fr/compare — active: `fr` → `/fr/compare`
- http://localhost:3020/terms — active: `en` → `/terms`
- http://localhost:3020/es/terms — active: `es` → `/es/terms`
- http://localhost:3020/fr/terms — active: `fr` → `/fr/terms`
- http://localhost:3020/faq — active: `en` → `/faq`
- http://localhost:3020/es/faq — active: `es` → `/es/faq`
- http://localhost:3020/fr/faq — active: `fr` → `/fr/faq`
- http://localhost:3020/privacy-policy — active: `en` → `/privacy-policy`
- http://localhost:3020/es/privacy-policy — active: `es` → `/es/privacy-policy`
- http://localhost:3020/fr/privacy-policy — active: `fr` → `/fr/privacy-policy`
- http://localhost:3020/resources/how-to-find-scholarships — active: `en` → `/resources/how-to-find-scholarships`
- http://localhost:3020/es/resources/how-to-find-scholarships — active: `es` → `/es/resources/how-to-find-scholarships`
- http://localhost:3020/fr/resources/how-to-find-scholarships — active: `fr` → `/fr/resources/how-to-find-scholarships`
- http://localhost:3020/essays/outline — active: `en` → `/essays/outline`
- http://localhost:3020/es/essays/outline — active: `es` → `/es/essays/outline`
- http://localhost:3020/fr/essays/outline — active: `fr` → `/fr/essays/outline`
- http://localhost:3020/compare/scholarship-vs-grant — active: `en` → `/compare/scholarship-vs-grant`
- http://localhost:3020/es/compare/scholarship-vs-grant — active: `es` → `/es/compare/scholarship-vs-grant`
- http://localhost:3020/fr/compare/scholarship-vs-grant — active: `fr` → `/fr/compare/scholarship-vs-grant`
- http://localhost:3020/subscription — active: `en` → `/subscription`
- http://localhost:3020/es/subscription — active: `es` → `/es/subscription`
- http://localhost:3020/fr/subscription — active: `fr` → `/fr/subscription`

## Intentionally English-only pages
