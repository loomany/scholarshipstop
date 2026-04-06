import { fieldOfStudySlug } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import { SCHOOL_LEVEL_OPTIONS } from '@/lib/constants/scholarshipProfileOptions';
import { US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';
import type { Json } from '@/types_db';
import type { Database } from '@/types_db';

export type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export type ScholarshipMatchRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'field_of_study'
  | 'study_levels'
  | 'catalog_education_levels'
  | 'citizenship_statuses'
  | 'gpa_requirement_min'
  | 'essay_required'
  | 'requirements_count'
  | 'requirement_signals_count'
  | 'state_territory_text'
  | 'state_codes'
>;

export type MatchResult = {
  score: number;
  reasons: string[];
};

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

/** Soft match: profile `state_region` stores full state name (e.g. California). */
function profileStateMatchesRow(
  profileStateFull: string | null | undefined,
  territoryText: string | null | undefined,
  stateCodesJson: Json | null | undefined
): boolean {
  const u = profileStateFull?.trim();
  if (!u) return false;
  const uLow = u.toLowerCase();
  const code = US_STATE_NAME_TO_CODE[u]?.toUpperCase();
  const codes = jsonStringArray(stateCodesJson).map((c) => c.trim().toUpperCase());
  if (code && codes.some((c) => c === code || c.endsWith(code) || c.startsWith(code))) {
    return true;
  }
  const t = territoryText?.trim().toLowerCase() ?? '';
  if (!t) return false;
  if (t.includes(uLow)) return true;
  if (code && (t.includes(code.toLowerCase()) || t.includes(code))) return true;
  return false;
}

function normalizeSlug(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '_');
}

const SCHOOL_LEVEL_LABEL_TO_VALUE = new Map(
  SCHOOL_LEVEL_OPTIONS.map((option) => [option.label.trim().toLowerCase(), option.value])
);

function effectiveProfileFieldOfStudy(profile: ProfilesRow | null): string {
  const value = profile?.field_of_study?.trim();
  if (value) return value.toLowerCase();
  const label = profile?.field_of_study_label?.trim();
  return label ? fieldOfStudySlug(label) : '';
}

function effectiveProfileSchoolLevel(profile: ProfilesRow | null): string {
  const value = profile?.school_level?.trim();
  if (value) return value;
  const label = profile?.school_level_label?.trim().toLowerCase();
  if (!label) return '';
  return SCHOOL_LEVEL_LABEL_TO_VALUE.get(label) ?? normalizeSlug(label);
}

/** Map profile school_level to tokens we compare against catalog / study_levels. */
function schoolLevelTokens(schoolLevel: string | null | undefined): Set<string> {
  const raw = schoolLevel?.trim().toLowerCase() ?? '';
  const out = new Set<string>();
  if (!raw) return out;
  out.add(raw);
  if (raw.startsWith('high_school')) {
    out.add('high_school');
    out.add('secondary');
    out.add('k12');
  }
  if (raw.startsWith('college_')) {
    out.add('undergraduate');
    out.add('college');
    out.add('undergrad');
  }
  if (raw === 'graduate_student') {
    out.add('graduate');
    out.add('masters');
    out.add('phd');
    out.add('doctoral');
  }
  if (raw === 'adult_non_traditional') {
    out.add('adult');
    out.add('non_traditional');
  }
  return out;
}

function scholarshipLevelTokens(row: ScholarshipMatchRow): Set<string> {
  const fromStudy = jsonStringArray(row.study_levels).map((s) => normalizeSlug(s));
  const fromCat = jsonStringArray(row.catalog_education_levels).map((s) =>
    normalizeSlug(s)
  );
  const out = new Set<string>();
  for (const x of fromStudy.concat(fromCat)) {
    out.add(x);
    if (x.includes('high')) out.add('high_school');
    if (x.includes('undergrad') || x.includes('college')) out.add('undergraduate');
    if (x.includes('grad') || x.includes('master') || x.includes('phd'))
      out.add('graduate');
  }
  return out;
}

function parseUserGpa(raw: ProfilesRow['gpa']): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === 'prefer_not_to_say' || s === 'n/a') return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function userDomestic(citizenship: string | null | undefined): boolean {
  const c = citizenship?.trim().toLowerCase() ?? '';
  return c === 'us_citizen' || c === 'us_permanent_resident';
}

function userInternational(citizenship: string | null | undefined): boolean {
  return citizenship?.trim().toLowerCase() === 'international_student';
}

/**
 * Strong negative signal: scholarship lists allowed citizenships and user clearly
 * conflicts with a US-only style list. We keep other profile signals alive instead
 * of hard-zeroing the whole row so partial-profile ranking can still degrade gracefully.
 */
function hardCitizenshipMismatch(
  userCitizenship: string | null | undefined,
  allowed: string[]
): boolean {
  if (allowed.length === 0) return false;
  const u = userCitizenship?.trim().toLowerCase() ?? '';
  if (!u) return false;

  const norm = allowed.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (norm.length === 0) return false;

  if (norm.some((a) => a === u || u.includes(a) || a.includes(u))) {
    return false;
  }

  const listUsOnly =
    norm.every(
      (a) =>
        a.includes('us') ||
        a.includes('united_states') ||
        a.includes('citizen') ||
        a === 'domestic'
    ) && !norm.some((a) => a.includes('international'));

  if (listUsOnly && userInternational(userCitizenship)) {
    return true;
  }

  const listIntlOk = norm.some((a) => a.includes('international'));
  if (!listIntlOk && userInternational(userCitizenship) && norm.length > 0) {
    return true;
  }

  return false;
}

function hasOpenEligibility(row: ScholarshipMatchRow): boolean {
  const fo = jsonStringArray(row.field_of_study);
  const cit = jsonStringArray(row.citizenship_statuses);
  const gpaMin = row.gpa_requirement_min;
  return (
    fo.length === 0 &&
    cit.length === 0 &&
    (gpaMin == null || Number.isNaN(Number(gpaMin)))
  );
}

function isEasyScholarshipRow(row: ScholarshipMatchRow): boolean {
  if (row.essay_required) return false;
  const rc = row.requirements_count;
  const rs = row.requirement_signals_count;
  const heavyRc = rc != null && rc > 2;
  const heavyRs = rs != null && rs > 2;
  return !heavyRc && !heavyRs;
}

export function matchScholarship(
  profile: ProfilesRow | null,
  row: ScholarshipMatchRow
): MatchResult {
  const reasons: string[] = [];
  if (!profile) {
    return { score: 55, reasons: ['Sign in and complete your profile for a tailored match.'] };
  }

  const userField = effectiveProfileFieldOfStudy(profile);
  const userSchool = effectiveProfileSchoolLevel(profile);
  const userCit = profile.citizenship_status?.trim() ?? '';
  const userGpa = parseUserGpa(profile.gpa);
  const userState = profile.state_region?.trim() ?? '';

  const schFields = jsonStringArray(row.field_of_study).map((s) => normalizeSlug(s));
  const schCit = jsonStringArray(row.citizenship_statuses);
  const citizenshipMismatch = hardCitizenshipMismatch(userCit, schCit);

  let score = 0;

  if (userField && schFields.length > 0) {
    if (schFields.some((f) => f === userField || f.includes(userField) || userField.includes(f))) {
      score += 30;
      reasons.push('Matches your field of study');
    }
  } else if (userField && schFields.length === 0) {
    score += 12;
    reasons.push('Open to multiple fields of study');
  }

  const uLevels = schoolLevelTokens(userSchool);
  const sLevels = scholarshipLevelTokens(row);
  if (uLevels.size && sLevels.size) {
    let hit = false;
    for (const t of Array.from(uLevels)) {
      if (
        sLevels.has(t) ||
        Array.from(sLevels).some((s) => s.includes(t) || t.includes(s))
      ) {
        hit = true;
        break;
      }
    }
    if (hit) {
      score += 25;
      reasons.push('Fits your school / degree level');
    }
  } else if (userSchool && sLevels.size === 0) {
    score += 8;
  }

  if (userCit && schCit.length > 0) {
    const ok = schCit.some(
      (c) =>
        c.trim().toLowerCase() === userCit.toLowerCase() ||
        (userDomestic(userCit) &&
          /us|united|citizen|resident|domestic/i.test(c))
    );
    if (ok) {
      score += 20;
      reasons.push('Citizenship eligibility aligns');
    }
  } else if (schCit.length === 0 && userCit) {
    score += 10;
    reasons.push('No strict citizenship filter on this listing');
  }

  const reqMin = row.gpa_requirement_min;
  if (userGpa != null && reqMin != null && !Number.isNaN(Number(reqMin))) {
    const min = Number(reqMin);
    if (userGpa >= min) {
      score += 15;
      reasons.push('Eligible for the GPA requirement');
    }
  } else if (userGpa != null && (reqMin == null || Number.isNaN(Number(reqMin)))) {
    score += 6;
    reasons.push('No minimum GPA stated — your GPA is on file');
  }

  if (
    userState &&
    profileStateMatchesRow(userState, row.state_territory_text, row.state_codes)
  ) {
    score += 10;
    reasons.push('May align with your state — confirm on the official listing');
  }

  if (hasOpenEligibility(row)) {
    score += 10;
    reasons.push('Fewer hard restrictions on this program');
  }

  if (citizenshipMismatch) {
    score = Math.max(0, score - 18);
    if (score > 0) {
      reasons.push('Check citizenship eligibility on the official listing');
    }
  }

  score = Math.min(100, Math.round(score));
  if (reasons.length === 0 && score > 0) {
    reasons.push('General catalog match');
  }
  return { score, reasons };
}

export function profileSupportsPersonalizedMatch(p: ProfilesRow | null): boolean {
  if (!p) return false;
  if (
    effectiveProfileFieldOfStudy(p) ||
    effectiveProfileSchoolLevel(p) ||
    p.citizenship_status?.trim() ||
    p.state_region?.trim()
  ) {
    return true;
  }
  /** Numeric GPA on file is enough to personalize (eligibility / ranking signal). */
  return parseUserGpa(p.gpa) != null;
}

export { isEasyScholarshipRow, parseUserGpa };
