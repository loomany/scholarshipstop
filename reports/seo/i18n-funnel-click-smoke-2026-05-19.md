# i18n funnel click smoke (2026-05-19)

Base URL: http://localhost:3000
Total: 10 · Passed: 10 · Failed: 0

| Locale | Check | Step | Pass | Expected | Actual | Error |
|---|---|---|---|---|---|---|
| es | Home CTA | click main scholarship CTA | ✅ | /es/get-scholarships | /es/get-scholarships |  |
| es | Direct /get-scholarships | status | ✅ | 200 | 200 |  |
| es | Direct /signin | auto-redirect to default view | ✅ | /es/signin/password_signin | /es/signin/password_signin |  |
| es | Header SignIn | click locale signin | ✅ | /es/signin/password_signin | /es/signin/password_signin |  |
| es | Forgot password | status | ✅ | 200 | 200 |  |
| fr | Home CTA | click main scholarship CTA | ✅ | /fr/get-scholarships | /fr/get-scholarships |  |
| fr | Direct /get-scholarships | status | ✅ | 200 | 200 |  |
| fr | Direct /signin | auto-redirect to default view | ✅ | /fr/signin/password_signin | /fr/signin/password_signin |  |
| fr | Header SignIn | click locale signin | ✅ | /fr/signin/password_signin | /fr/signin/password_signin |  |
| fr | Forgot password | status | ✅ | 200 | 200 |  |