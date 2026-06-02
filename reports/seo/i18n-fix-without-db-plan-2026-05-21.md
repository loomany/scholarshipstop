# Fix without DB translation — 2026-05-21

**Scope:** Code-only UI/static/taxonomy display fixes. No `content_translations`, no OpenAI, no production seed.

---

## P0 — Ship first (user-visible chrome)

| # | Component / file | EN (current) | ES (expected) | FR (expected) | Risk | Test |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ScholarshipCard.tsx` + `scholarshipsHubUiCopy.ts` | Award Amount | Monto de la beca | Montant de la bourse | Low | ES/FR hub + category STEM cards |
| 2 | Same | Requirements | Requisitos | Exigences | Low | Card metrics |
| 3 | Same | NEW | NUEVO | NOUVEAU | Low | Unread badge |
| 4 | Same | Best for: / Effort: / Source: | Mejor para: / Esfuerzo: / Fuente: | Meilleur pour: / Effort: / Source: | Med | Badge row |
| 5 | Same | Host: | Anfitrión: | Pays d’accueil: | Low | Chip label |
| 6 | `ScholarshipHubCanonicalSeo.tsx` | Continue your scholarship search | Continúa tu búsqueda de becas | Poursuivez votre recherche de bourses | Med | `/es/scholarships` footer |
| 7 | Same | Explore → + card titles/bodies | Use `continueSearch` from `scholarshipsHubUiCopy` | Same FR pack | Med | Footer 4-card grid |
| 8 | `ProvidersHubCard.tsx` | View Profile | Ver perfil | Voir le profil | Low | Provider grid |
| 9 | Same | Active Scholarship(s) | Beca activa / Becas activas | Bourse active / Bourses actives | Low | Count badge |
| 10 | Same | Profile enriched / Not manually reviewed | Perfil enriquecido / Sin revisión manual | Profil enrichi / Non revu manuellement | Low | Badges |
| 11 | `providerSeoQualityPolicy.ts` or wrapper | Official source available… | Fuente oficial disponible… | Source officielle disponible… | Med | Provider badges |
| 12 | `ProvidersHubToolbar.tsx` | Countries | Países | Pays | Low | Dropdown label |
| 13 | Same | Search providers (placeholder) | Buscar proveedores | Rechercher des fournisseurs | Low | Use existing `searchPlaceholder` in hubUiCopy |
| 14 | `CompareCardGrid.tsx` | Read more → | Leer más → | Lire la suite → | Low | Pass `locale`; use `getHubToolbarUiCopy` |
| 15 | `app/compare/universities/page.tsx` + states | Showing… (toolbar) | Mostrando… | Affichage… | Med | Localize wrapper or duplicate toolbar props for `[locale]` pages |
| 16 | `ResourcesIndexPageContent.tsx` | Read more → | Leer más → | Lire la suite → | Low | Resources grid |
| 17 | `EssaysIndexToolbar.tsx` | Filters / Categories | Filtros / Categorías | Filtres / Catégories | Low | Wire `getHubToolbarUiCopy` (already imported) |
| 18 | `EssaysIndexResultSummary.tsx` | Showing / Found | Mostrando / Encontradas | Affichage / Trouvées | Low | Add `locale` prop |
| 19 | `ScholarshipCategoryPageClient.tsx` | Save / Not relevant | Guardar / No relevante | Enregistrer / Non pertinent | Med | Pass `cardCopy={hubUi.card}` |
| 20 | `Navlinks.tsx` | (hidden) Precios / Tarifs | Show link | Show link | Low | Desktop nav + active state on subscription |

---

## P1 — Taxonomy display (no DB translation)

| # | Area | File(s) | Approach | Test |
| --- | --- | --- | --- | --- |
| 21 | Category chips on cards | `lib/scholarships/categories` + card chip builder | `getLocalizedCategoryLabel(locale, id)` | STEM page chips |
| 22 | Best-for levels | `getScholarshipBestForLabel` | Locale parameter | Card badges |
| 23 | Source status short labels | `getScholarshipSourceStatus` | Locale map | Source badge |
| 24 | Effort/difficulty levels | `getScholarshipApplicationDifficulty` | Locale map | Effort badge |
| 25 | Country names in filters | `countryLabelFromCode` or i18n map | Display names ES/FR where available | Study in / I'm from popovers |
| 26 | Compare kind labels | University vs University / State vs State | Page chrome only (not DB titles) | Subhub H1 + breadcrumb |

---

## P2 — Polish (still no DB)

| # | Item | Notes |
| --- | --- | --- |
| 27 | FAQ section on hub footer | Translate `scholarshipHubCanonicalSeoContent` FAQ or hide on ES/FR |
| 28 | `ResourcesIndexPageContent` static card **titles** | Move to `staticResourceHub` ES/FR entries (static files — not CMS DB) |
| 29 | Provider empty state | “Profile details will appear after enrichment.” |
| 30 | Compare subhub intro paragraph | Localize `baseDescription` in universities/states pages |

---

## Verification checklist (post-P0)

```powershell
$env:SCREENSHOT_BASE_URL='https://scholarshiptop.com'
npx tsx scripts/seo/i18n-p0-live-regression-smoke.ts
npx tsx scripts/seo/i18n-full-translation-gap-audit-run.ts
# Expect: scholarships/providers/compare-universities/resources/essays chrome hits → 0
```

---

## Out of scope for this plan

- Scholarship/provider/compare **body** text
- Resource **CMS** articles (Stage 4D)
- Lemon checkout copy
- `/essay` product
