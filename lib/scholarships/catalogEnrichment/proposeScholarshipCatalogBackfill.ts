import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';
import { SCHOLARSHIP_FIELD_OF_STUDY_OPTIONS } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import type { Database, Json } from '@/types_db';
import { parseScholarshipCountryEligibility } from '@/lib/scholarships/countryEligibility/parseScholarshipCountryEligibility';

import { matchTextBlobFromRow, type ScholarshipRowForMatchBlob } from './matchTextBlobFromRow';

export type ScholarshipRowForCatalogBackfill = ScholarshipRowForMatchBlob &
  Pick<
    Database['public']['Tables']['scholarships']['Row'],
    | 'id'
    | 'slug'
    | 'source'
    | 'provider_name'
    | 'raw_data'
    | 'citizenship_statuses'
    | 'applicant_country_codes'
    | 'host_country_codes'
    | 'country_eligibility_notes'
    | 'catalog_education_levels'
    | 'study_levels'
    | 'field_of_study'
    | 'gpa_bucket'
    | 'gpa_requirement_min'
    | 'state_codes'
    | 'location_tags'
    | 'location_scope'
  >;

export type CatalogMatchBackfillPatch = {
  citizenship_statuses?: Json;
  applicant_country_codes?: Json;
  host_country_codes?: Json;
  country_eligibility_notes?: Json;
  catalog_education_levels?: Json;
  study_levels?: Json;
  field_of_study?: Json;
  gpa_bucket?: string | null;
  gpa_requirement_min?: number | null;
  state_codes?: Json;
  location_tags?: Json;
};

function jsonStrArr(v: Json | null | undefined): string[] {
  if (!v || !Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function uniqSorted(a: string[]): string[] {
  return Array.from(new Set(a.map((x) => x.trim()).filter(Boolean))).sort();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * USPS codes from free text via full state names + DC only.
 * (Two-letter codes are omitted: e.g. "Florida or Georgia" would false-match `OR` → Oregon.)
 */
function stateCodesFromPlainText(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const lower = t.toLowerCase();
  const out = new Set<string>();

  for (const name of Object.keys(US_STATE_NAME_TO_CODE)) {
    const re = new RegExp(`\\b${escapeRegex(name)}\\b`, 'i');
    if (re.test(lower)) {
      out.add(US_STATE_NAME_TO_CODE[name]!);
    }
  }
  if (/\b(?:district\s+of\s+columbia|washington\s*,?\s*dc)\b/i.test(t)) {
    out.add('DC');
  }
  return [...out];
}

/** Strong signals that the award is not for typical U.S. domestic profile matching. */
function isInternationalExclusiveBlob(blob: string): boolean {
  return (
    /\bonly\s+(?:for\s+)?(?:non[-\s]?u\.?s\.?\s+)?(?:citizens?|nationals?)\b/i.test(blob) ||
    /\bmust\s+not\s+be\s+(?:a\s+)?u\.?s\.?\s+citizen\b/i.test(blob) ||
    /\bopen\s+only\s+to\s+international\s+students?\b/i.test(blob) ||
    /\b(?:restricted|limited)\s+to\s+foreign\s+nationals?\b/i.test(blob) ||
    /\boutside\s+(?:the\s+)?united\s+states\b/i.test(blob) &&
      !/\bu\.?s\.?\s+(?:citizen|resident|student)/i.test(blob)
  );
}

/** Clear U.S. citizenship / permanent resident eligibility phrasing. */
function inferDomesticCitizenshipStatuses(blob: string): string[] {
  if (isInternationalExclusiveBlob(blob)) return [];

  const out = new Set<string>();
  if (
    /\bu\.?s\.?\s+citizens?\b/i.test(blob) ||
    /\bcitizens?\s+of\s+the\s+united\s+states\b/i.test(blob) ||
    /\bamerican\s+citizens?\b/i.test(blob)
  ) {
    out.add('us_citizen');
  }
  if (
    /\b(?:u\.?s\.?\s+)?permanent\s+residents?\b/i.test(blob) ||
    /\bgreen\s+card\b/i.test(blob) ||
    /\b(?:legal\s+)?(?:u\.?s\.?\s+)?resident\s+alien\b/i.test(blob)
  ) {
    out.add('us_permanent_resident');
  }
  if (
    /\bu\.?s\.?\s+citizens?\s+and\s+permanent\s+residents?\b/i.test(blob) ||
    /\bcitizens?\s+or\s+permanent\s+residents?\s+of\s+the\s+united\s+states\b/i.test(blob)
  ) {
    out.add('us_citizen');
    out.add('us_permanent_resident');
  }
  /** Broad “U.S. students” wording when not contradicted by intl-exclusive heuristics above. */
  if (
    out.size === 0 &&
    (/\bunited\s+states\s+(?:high\s+school|college|university|student)/i.test(blob) ||
      /\b(?:u\.?s\.?|us)\s+(?:high\s+school|undergraduate|graduate|college)\s+students?\b/i.test(blob) ||
      /\battending\s+(?:a\s+)?(?:u\.?s\.?|us|united\s+states)\s+/i.test(blob))
  ) {
    out.add('us');
  }
  return [...out];
}

const EDU_FROM_BLOB: { re: RegExp; id: string }[] = [
  { re: /\bhigh\s+school\s+seniors?\b/i, id: 'high_school_senior' },
  { re: /\bhigh\s+school\b/i, id: 'high_school' },
  { re: /\bundergraduates?\b|\bcollege\s+students?\b|\bbachelor'?s?\b/i, id: 'undergraduate' },
  { re: /\bgraduate\s+students?\b|\bmasters?\b|\bmba\b/i, id: 'graduate' },
  { re: /\bphd\b|\bdoctoral\b/i, id: 'phd' },
  { re: /\bcommunity\s+college\b/i, id: 'community_college' },
  { re: /\btrade\s+school\b|\bvocational\b/i, id: 'trade_school' }
];

function inferCatalogEducationLevels(blob: string): string[] {
  const out = new Set<string>();
  for (const { re, id } of EDU_FROM_BLOB) {
    if (re.test(blob)) out.add(id);
  }
  return [...out];
}

function studyLevelLabelsFromCatalogIds(ids: string[]): string[] {
  const labels: string[] = [];
  for (const id of ids) {
    switch (id) {
      case 'high_school':
      case 'high_school_senior':
        labels.push('High school');
        break;
      case 'undergraduate':
        labels.push('Undergraduate');
        break;
      case 'graduate':
        labels.push('Graduate');
        break;
      case 'phd':
        labels.push('PhD');
        break;
      case 'community_college':
        labels.push('Community college');
        break;
      case 'trade_school':
        labels.push('Trade school');
        break;
      default:
        break;
    }
  }
  return uniqSorted(labels);
}

function parseGpaMinFromBlob(blob: string): number | null {
  const m = blob.match(/\bgpa\b[^0-9]{0,14}([23](?:\.\d{1,2})?)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

function gpaMinToBucketId(min: number | null): string {
  if (min == null || Number.isNaN(min)) return 'no_gpa_requirement';
  if (min >= 3.5) return 'gpa_3_5_plus';
  if (min >= 3.0) return 'gpa_3_0_plus';
  if (min >= 2.5) return 'gpa_2_5_plus';
  if (min >= 2.0) return 'gpa_2_0_plus';
  return 'no_gpa_requirement';
}

/** Keywords → canonical profile field_of_study slugs (same space as onboarding). */
function inferFieldOfStudySlugs(blob: string): string[] {
  const out = new Set<string>();
  const add = (v: string) => {
    if (v && v !== 'not_listed_other') out.add(v);
  };
  if (/\bengineering\b/i.test(blob)) add('engineering');
  if (/\bcomputer\s+science\b|\bsoftware\s+engineering\b/i.test(blob)) {
    add('computer_and_information_sciences');
  }
  if (/\bnursing\b|\bpre[-\s]?med\b|\bmedicine\b|\bhealth\s+professions\b/i.test(blob)) {
    add('health_professions_and_clinical_sciences');
  }
  if (/\beducation\b|\bteacher\b|\bteaching\b/i.test(blob)) add('education');
  if (/\bbusiness\b|\bmarketing\b|\bmba\b/i.test(blob)) {
    add('business_management_and_marketing');
  }
  if (/\bpsychology\b/i.test(blob)) add('psychology');
  if (/\bbiology\b|\bbiomedical\b/i.test(blob)) add('biological_and_biomedical_sciences');

  for (const { label, value } of SCHOLARSHIP_FIELD_OF_STUDY_OPTIONS) {
    if (value === 'not_listed_other') continue;
    const tokens = label
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 5);
    const hit = tokens.some((t) => new RegExp(`\\b${escapeRegex(t)}\\b`, 'i').test(blob));
    if (hit) add(value);
    if (out.size >= 5) break;
  }
  return uniqSorted([...out]);
}

function jsonArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

/**
 * Proposes DB column updates so hub profile filters (Best recommendation) hit more rows.
 * Conservative: fills empty / null structured fields from text; does not strip existing tags.
 */
export function proposeScholarshipCatalogBackfill(
  row: ScholarshipRowForCatalogBackfill
): { patch: CatalogMatchBackfillPatch; reasons: string[] } | null {
  const blob = matchTextBlobFromRow(row);
  const reasons: string[] = [];
  const patch: CatalogMatchBackfillPatch = {};

  const cit = jsonStrArr(row.citizenship_statuses);
  if (cit.length === 0) {
    const inferred = inferDomesticCitizenshipStatuses(blob);
    if (inferred.length > 0) {
      patch.citizenship_statuses = inferred;
      reasons.push(`citizenship_statuses ← [${inferred.join(', ')}]`);
    }
  }

  const applicantCountries = uniqSorted(jsonStrArr(row.applicant_country_codes));
  const hostCountries = uniqSorted(jsonStrArr(row.host_country_codes));
  const countryEligibility = parseScholarshipCountryEligibility({
    title: row.title,
    providerName: row.provider_name,
    source: row.source,
    stateTerritoryText: row.state_territory_text,
    eligibilityText: row.eligibility_text,
    requirementsText: row.requirements_text,
    description: row.description,
    summaryShort: row.summary_short,
    summaryLong: row.summary_long,
    rawData: row.raw_data
  });
  const nextApplicantCountries = uniqSorted([
    ...applicantCountries,
    ...countryEligibility.applicantCountryCodes
  ]);
  const nextHostCountries = uniqSorted([
    ...hostCountries,
    ...countryEligibility.hostCountryCodes
  ]);
  if (!jsonArraysEqual(applicantCountries, nextApplicantCountries)) {
    patch.applicant_country_codes = nextApplicantCountries;
    reasons.push(
      `applicant_country_codes (${applicantCountries.length}→${nextApplicantCountries.length})`
    );
  }
  if (!jsonArraysEqual(hostCountries, nextHostCountries)) {
    patch.host_country_codes = nextHostCountries;
    reasons.push(`host_country_codes (${hostCountries.length}→${nextHostCountries.length})`);
  }
  if (
    countryEligibility.reasons.length > 0 &&
    jsonStrArr(row.country_eligibility_notes).length === 0
  ) {
    patch.country_eligibility_notes = countryEligibility.reasons;
  }

  const catalogEdu = jsonStrArr(row.catalog_education_levels);
  const study = jsonStrArr(row.study_levels);
  if (catalogEdu.length === 0 && study.length === 0) {
    const edu = inferCatalogEducationLevels(blob);
    if (edu.length > 0) {
      patch.catalog_education_levels = edu;
      patch.study_levels = studyLevelLabelsFromCatalogIds(edu);
      reasons.push(`catalog_education_levels ← [${edu.join(', ')}]`);
    }
  }

  const fos = jsonStrArr(row.field_of_study);
  if (fos.length === 0) {
    const inferredFos = inferFieldOfStudySlugs(blob);
    if (inferredFos.length > 0) {
      patch.field_of_study = inferredFos;
      reasons.push(`field_of_study ← [${inferredFos.join(', ')}]`);
    }
  }

  const bucketRaw = row.gpa_bucket?.trim() ?? '';
  if (!bucketRaw) {
    let min = row.gpa_requirement_min != null && !Number.isNaN(Number(row.gpa_requirement_min))
      ? Number(row.gpa_requirement_min)
      : null;
    if (min == null) min = parseGpaMinFromBlob(blob);
    if (min != null) {
      patch.gpa_requirement_min = min;
      patch.gpa_bucket = gpaMinToBucketId(min);
      reasons.push(`gpa_bucket ← ${patch.gpa_bucket} (min ${min})`);
    } else if (/\bno\s+gpa\b|\bgpa\s+not\s+required\b|\bwithout\s+a\s+gpa\b/i.test(blob)) {
      patch.gpa_bucket = 'no_gpa_requirement';
      reasons.push('gpa_bucket ← no_gpa_requirement (text)');
    }
  }

  const stateCodes = uniqSorted(jsonStrArr(row.state_codes));
  const scope = (row.location_scope ?? '').toLowerCase();
  const nationwide =
    scope.includes('national') || /\bnationwide\b|\bany\s+state\b|\ball\s+50\s+states\b/i.test(blob);
  const fromText = nationwide ? [] : stateCodesFromPlainText(blob);
  const finalStates = uniqSorted([...stateCodes, ...fromText]);
  if (!jsonArraysEqual(stateCodes, finalStates)) {
    patch.state_codes = finalStates;
    reasons.push(`state_codes (${stateCodes.length}→${finalStates.length})`);
  }

  const locTags = uniqSorted(jsonStrArr(row.location_tags));
  const nextLoc = nationwide ? locTags : uniqSorted([...locTags, ...finalStates]);
  if (!jsonArraysEqual(locTags, nextLoc)) {
    patch.location_tags = nextLoc;
    reasons.push(`location_tags (${locTags.length}→${nextLoc.length})`);
  }

  if (Object.keys(patch).length === 0) return null;
  return { patch, reasons };
}
