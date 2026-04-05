# Scholarships V2 Verification Pass (Isolation + Mapping Audit)

Date: 2026-04-05

## 1) New files in `lib/scholarships-v2/`

- `filters/contract.ts`
- `filters/effective.ts`
- `filters/normalize.ts`
- `index.ts`
- `internalAdapter.ts`
- `matching/scoring.ts`
- `pipeline/counts.ts`
- `pipeline/list.ts`
- `pipeline/requestKey.ts`
- `tabs/userCollections.ts`
- `types.ts`

## 2) Runtime isolation check

Command used:

- `rg "scholarships-v2" -n app components lib | sort`

Result summary:

- All references are internal to `lib/scholarships-v2/*`.
- No imports from `app/**`, `components/**`, or legacy `lib/scholarships/**` files.
- Therefore, existing route/page/component runtime paths do not import v2 engine.

## 3) Runtime behavior check

Command used:

- `git show --name-only --pretty=format: HEAD`

Result summary:

- The head commit only adds files inside `lib/scholarships-v2/`.
- No existing route/page/component file was modified.
- Current website runtime and current `/scholarships` legacy flow are unchanged by wiring.

## 4) Internal adapter scenarios (3-5 concrete examples)

Command used:

- `npx tsx /tmp/v2_scenarios.ts`

Input dataset:

- `s1`: `eligibleStateCodes=["FL"]`, `citizenships=["us_citizen"]`, `educationLevels=["undergraduate"]`, `fieldsOfStudy=["computer_science"]`, `minGpa=3.0`
- `s2`: `eligibleStateCodes=[]`, `stateTerritoryText="Open to students studying in FL and GA"`, `citizenships=["international_students"]`, `educationLevels=["undergraduate"]`, `fieldsOfStudy=["biology"]`, `minGpa=2.5`

Observed outputs:

1. **Catalog list**
   - total `2`
   - ids: `["s1", "s2"]`

2. **Best matches (profile = undergrad/us_citizen/cs/FL/gpa 3.4)**
   - ranked:
     - `s1` score `1.00`
     - `s2` score `0.55`

3. **User collection mode**
   - with `userCollectionTab=saved`, request key mode resolves to `"userCollections"`
   - verified by command:
     - `npx tsx -e "... getScholarshipList ... console.log(requestKey)"`

4. **State filter layered case**
   - profile state `FL`:
     - `s1` gets state score `1.0` via structured `eligibleStateCodes`
     - `s2` gets state score `0.75` via fallback text `stateTerritoryText`

5. **Profile-based scoring case**
   - score components used in v2: education, citizenship, state, fieldOfStudy, GPA
   - weighted total formula used by engine:
     - `education*0.30 + citizenship*0.25 + state*0.20 + fieldOfStudy*0.15 + gpa*0.10`

## 5) Legacy data mapping assumptions used for v2 design

Main source references:

- `types_db.ts`
- `lib/scholarships/personalizedListingSql.ts`
- `lib/scholarships/scholarshipMatch.ts`
- `lib/scholarships/scholarshipListServer.ts`

Assumptions by dimension:

- **State matching**
  - primary structured: `scholarships.state_codes` (JSON)
  - fallback semi-structured: `scholarships.state_territory_text` (text)

- **Citizenship**
  - scholarship side: `scholarships.citizenship_statuses` (JSON)
  - profile side: `profiles.citizenship_status` (string enum-ish values)

- **Education level**
  - scholarship side: `scholarships.catalog_education_levels` (JSON)
  - legacy adjunct signals may also exist in `eligibility_tags`/SEO tags

- **Field of study**
  - scholarship side: `scholarships.field_of_study` (JSON)
  - profile side: `profiles.field_of_study` + fallback `profiles.field_of_study_label`

- **GPA**
  - scholarship side: `scholarships.gpa_requirement_min` (+ optional `gpa_bucket` for catalog tags)
  - profile side: `profiles.gpa` (number|string|null legacy shape)

## 6) Potential mismatches / risks (v2 contract vs legacy data)

1. **State fallback currently code-only text check in v2**
   - v2 fallback currently checks uppercase state code substring (e.g., `FL`) in free text.
   - legacy and real text may contain full names (`Florida`) or mixed forms.
   - risk: false negatives/positives without canonical state lexicon normalization.

2. **Citizenship taxonomy normalization gap**
   - legacy SQL handles synonyms (`us_citizen`, `us`, `domestic`, `international`, `international_students`).
   - v2 contract currently assumes already-normalized IDs.

3. **Education-level vocabulary drift**
   - legacy sometimes mixes signals across `catalog_education_levels` and tag-derived dimensions.
   - v2 currently models a single normalized list only.

4. **Field-of-study normalization differences**
   - legacy uses slugification/fallback (`field_of_study_label` -> slug).
   - v2 scoring currently compares exact normalized values supplied to it.

5. **GPA shape differences**
   - legacy profile GPA can be `string|number|null`.
   - v2 scoring expects numeric GPA in `profileSignals` and min/max numeric eligibility.

6. **Collection tabs are modeled, but adapter is synthetic**
   - v2 has tab mode separation; in-memory adapter returns zero per-tab counts.
   - production tab counts will require real data-source mapping.

## 7) Recommended next safe step

Without touching live routes/UI:

1. Add a dedicated **v2 DB adapter** under `lib/scholarships-v2/adapters/` that maps legacy DB rows to `ScholarshipRecord`.
2. Add a **normalization dictionary layer** for state names/codes and citizenship synonyms.
3. Add isolated **unit tests** for:
   - effective filter precedence
   - mode resolution (catalog/bestMatches/userCollections)
   - state layered matching
   - profile scoring breakdown
4. Keep all this behind internal-only usage; no route wiring yet.
