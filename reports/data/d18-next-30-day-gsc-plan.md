# D18 Next 30-Day GSC Plan

Date: 2026-06-01  
Assumes GSC manual export OR service account permission fix within week 1.

---

## Immediate (this week)

- [ ] **URL Inspection** on all P1 URLs (`d18-url-inspection-actions.md`)
- [ ] **Request indexing** for P1 pages only if Inspection shows not on Google or stale vs D11–D16
- [ ] **Fix GSC access** — add service account to property OR complete manual Performance export
- [ ] Fill `d18-gsc-performance-export.csv` with 7-day and 28-day page stats
- [ ] P2 inspect-only on noindex URLs — confirm robots unchanged

---

## Next 7 days

Monitor after Inspection/indexing requests:

| URL | Monitor |
|---|---|
| `/resources/medical-scholarships-guide` | First impressions? Indexed verdict? |
| `/essays/career-goals` | CTR vs position for "career goals" queries |
| `/resources/best-scholarships-texas-international-students` | Texas + international query impressions |
| `/providers/loyola-university-chicago` | Provider long-tail visibility |

Also:

- [ ] Confirm sitemap-discovered pages are crawled (Coverage or Inspection)
- [ ] Check `resources.xml` still lists medical guide (regression watch)

---

## Next 14 days

If GSC export shows data:

| Signal | Action |
|---|---|
| Impressions > 50, CTR < 2%, position 5–15 | **Title/meta polish** (start with texas intl "2024 Guide") |
| Impressions > 0, position > 20 | **Intro copy polish** + internal links from medical cluster |
| Zero impressions after Inspection + 14 days | **Internal link boost** + re-Inspect |
| Medical guide traction | Evaluate **nursing/pre-med guide** (D17/D19 content) |

If no GSC data yet:

- Continue manual weekly Inspection on medical guide
- Use site analytics (if available outside repo) as proxy

---

## Next 30 days

- [ ] Build query-led polish backlog from exported top queries
- [ ] Decide nursing guide (`/resources/nursing-scholarships-guide`) if medical guide gets sustained impressions
- [ ] Re-run `npx tsx reports/data/_d18-gsc-pull.ts` after API access fixed
- [ ] Optional: weekly Telegram SEO digest correlation with enriched URL cohort

---

## Do not do in this 30-day window

- Change canonical/robots/noindex/sitemap policy
- Request indexing on noindex URLs
- Ship new datasets or Supabase changes
- Commit GSC exports with private account data

---

## Success metrics

| Metric | Target (30 days) |
|---|---|
| P1 URLs "URL is on Google" in Inspection | 4/4 |
| Medical guide first impressions | > 0 |
| Any P1 page CTR improvement after title polish | Measurable if export available |
| GSC API | 403 resolved OR stable manual export cadence |
