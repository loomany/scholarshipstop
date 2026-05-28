# Scholarship SEO Sitemap Validation - 2026-05-28

## Local validation setup

Commands:

```powershell
npm run build
npm run start -- -p 3028
```

The local production server was started on port `3028`, checked, and stopped after validation.

## Exact URL checks

| URL | Metadata | Exact URL in sitemap |
|---|---|---:|
| `/scholarships/california` | `noindex, follow` | no |
| `/scholarships/no-essay` | `noindex, follow` | no |
| `/scholarships/connecticut/high-school/nursing` | `noindex, follow` | no |
| `/scholarships/texas/high-school/arts` | `noindex, follow` | no |
| `/scholarships/engineering` | `index, follow` | yes |
| `/scholarships/for-students-from/canada/study-in/united-states` | `index, follow` | yes |
| `/scholarships/category/stem` | default indexable | yes in `categories.xml` |
| `/scholarships/category/education` | default indexable | yes in `categories.xml` |

## RSS regression check

| Feed | Status | Content-Type |
|---|---:|---|
| `/rss.xml` | 200 | `application/rss+xml; charset=utf-8` |
| `/rss/resources.xml` | 200 | `application/rss+xml; charset=utf-8` |
| `/rss/essays.xml` | 200 | `application/rss+xml; charset=utf-8` |
| `/rss/compare.xml` | 200 | `application/rss+xml; charset=utf-8` |
| `/rss/categories.xml` | 200 | `application/rss+xml; charset=utf-8` |

## Result

The known weak long-tail/filter examples no longer conflict with sitemap policy. Strong categories, a strong manifest page, and approved cross-country route remain discoverable.
