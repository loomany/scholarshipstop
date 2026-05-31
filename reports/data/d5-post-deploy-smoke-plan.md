# D5 — Post-Deploy Smoke Plan

**Date:** 2026-05-31  
**Deploy:** After merge of `feat(seo): strengthen internal scholarship link graph`

## URLs (8)

1. https://scholarshiptop.com/scholarships/texas
2. https://scholarshiptop.com/scholarships/texas/tarleton-state-university
3. https://scholarshiptop.com/providers/loyola-university-chicago
4. https://scholarshiptop.com/resources/best-scholarships-texas-international-students
5. https://scholarshiptop.com/resources/best-scholarship-websites
6. https://scholarshiptop.com/essays/financial-need
7. https://scholarshiptop.com/compare/states/california-vs-texas
8. https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida

## Pass criteria

- [ ] All URLs return HTTP 200
- [ ] No visible `undefined`, `null`, or `NaN` in page HTML
- [ ] At most **one** related-link nav block per enrichment section
- [ ] Texas state page shows: Compare states, Compare universities, How to find scholarships, Financial need essay guide
- [ ] Tarleton university page shows state link + compare universities + essay; provider link if hub slug matches
- [ ] Loyola provider page shows state scholarships link (IL) when Scorecard match renders
- [ ] Texas international students resource shows contextual cluster (not generic spam)
- [ ] Generic resource (`best-scholarship-websites`) — **no** state/school enrichment block
- [ ] Generic essay (`financial-need`) — **no** fake state cluster (may stay hidden)
- [ ] Compare state detail links to both CA and TX scholarship pages
- [ ] Compare university detail links to relevant state pages + useful next steps
- [ ] View-source: canonical and robots meta unchanged vs pre-deploy
- [ ] Rollback decision: **no** unless broken links, duplicate blocks, or SEO regressions

## Quick curl checks

```powershell
$urls = @(
  'https://scholarshiptop.com/scholarships/texas',
  'https://scholarshiptop.com/scholarships/texas/tarleton-state-university',
  'https://scholarshiptop.com/providers/loyola-university-chicago',
  'https://scholarshiptop.com/resources/best-scholarships-texas-international-students',
  'https://scholarshiptop.com/resources/best-scholarship-websites',
  'https://scholarshiptop.com/essays/financial-need',
  'https://scholarshiptop.com/compare/states/california-vs-texas',
  'https://scholarshiptop.com/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida'
)
foreach ($u in $urls) {
  $r = Invoke-WebRequest -Uri $u -UseBasicParsing
  Write-Output "$($r.StatusCode) $u"
}
```

## Rollback

Revert D5 commit on main if duplicate link blocks appear or generic pages show incorrect state/school context.
