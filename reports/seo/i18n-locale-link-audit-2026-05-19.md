# Stage 2 locale link audit

Generated: 2026-05-21T12:40:04.664Z
Base URL: http://localhost:3020
Mode: full crawl

## Summary

- Pages crawled: 118
- Total links scanned: 134 (issues only)
- Blocking link issues: 0
- Allowed explicit English (Zone C: DB/long-tail / product flow): 82
- Language-switcher cross-locale links (informational): 52
  - to other Stage 2 locale (es ↔ fr): 26
  - to English canonical (current page / home): 26
- Click tests passed: 18
- Click tests failed: 0
- Pricing visible on /es nav: no (expected)

## Blocking by category


## Blocking by page (top 30)


## Blocking links (first 40)


## Click tests

- [x] es Buscar becas → expected `/es/scholarships` got `/es/scholarships/hub/best-recommendation` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/es/scholarships"]`)
- [x] es Proveedores → expected `/es/providers` got `/es/providers` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/es/providers"]`)
- [x] es Comparar → expected `/es/compare` got `/es/compare` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/es/compare"]`)
- [x] es Recursos → expected `/es/resources` got `/es/resources` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/es/resources"]`)
- [x] es Ensayos → expected `/es/essays` got `/es/essays` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/es/essays"]`)
- [x] es Footer About → expected `/es/about` got `/es/about` (`footer a[href="/es/about"]`)
- [x] es Footer Terms → expected `/es/terms` got `/es/terms` (`footer a[href="/es/terms"]`)
- [x] es Footer FAQ → expected `/es/faq` got `/es/faq` (`footer a[href="/es/faq"]`)
- [x] es Footer Privacy → expected `/es/privacy-policy` got `/es/privacy-policy` (`footer a[href="/es/privacy-policy"]`)
- [x] fr Chercher des bourses → expected `/fr/scholarships` got `/fr/scholarships/hub/best-recommendation` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/fr/scholarships"]`)
- [x] fr Fournisseurs → expected `/fr/providers` got `/fr/providers` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/fr/providers"]`)
- [x] fr Comparer → expected `/fr/compare` got `/fr/compare` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/fr/compare"]`)
- [x] fr Ressources → expected `/fr/resources` got `/fr/resources` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/fr/resources"]`)
- [x] fr Guides d'essai → expected `/fr/essays` got `/fr/essays` (`xpath=//main[@id="skip"]/preceding-sibling::nav[1]//a[@href="/fr/essays"]`)
- [x] fr Footer About → expected `/fr/about` got `/fr/about` (`footer a[href="/fr/about"]`)
- [x] fr Footer Terms → expected `/fr/terms` got `/fr/terms` (`footer a[href="/fr/terms"]`)
- [x] fr Footer FAQ → expected `/fr/faq` got `/fr/faq` (`footer a[href="/fr/faq"]`)
- [x] fr Footer Privacy → expected `/fr/privacy-policy` got `/fr/privacy-policy` (`footer a[href="/fr/privacy-policy"]`)