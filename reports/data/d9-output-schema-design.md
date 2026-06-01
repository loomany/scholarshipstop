# D9 Output Schema Design

Target output:

`data/external/scholarshiptop-enrichment/city_rent_metro_enrichment.json`

## Record Shape

```ts
type CityRentMetroEnrichment = {
  city_key: string
  city: string
  state: string
  state_code: string
  county?: string | null
  county_fips?: string | null
  metro_name?: string | null
  metro_code?: string | null
  lat?: number | null
  lng?: number | null
  population?: number | null

  hud_fmr_1br?: number | null
  hud_fmr_2br?: number | null

  zillow_latest_rent?: number | null
  zillow_rent_12mo_change_pct?: number | null
  zillow_latest_month?: string | null

  bls_median_wage?: number | null
  bls_mean_wage?: number | null
  bls_employment?: number | null
  bls_year?: number | null

  rent_context?: string | null
  wage_context?: string | null

  source_years?: Record<string, string | number>
  sources: string[]
}
```

## Matching Policy

- Base rows come from existing `location_crosswalk.json`, one row per known `city|state`.
- HUD FMR values are reused from existing `city_affordability.json` only when the city/state key is unambiguous.
- BLS metro rows are filtered to all-occupations rows only, then matched by exact normalized city token and state from the metro area name.
- Zillow ZORI rows are reduced to latest rent and approximate 12-month change, then matched by exact normalized city token and state from the metro name.
- If a city/state maps to multiple BLS or Zillow metro candidates, those metro fields are omitted.
- No fuzzy matching is used.

## Output Constraints

- Target size: under 5 MB.
- Hard stop: over 10 MB.
- No raw monthly Zillow time series.
- No full BLS occupation table.
- No raw customer package path strings.
- No exact street or personal data.
- Neutral copy only; no city rankings or "best/worst" wording.
