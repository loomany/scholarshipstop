import type { Scholarship } from '@/app/scholarships/scholarshipsData';
import { fieldOfStudySlug } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import { profileGpaSelectionFromSnapshot } from '@/lib/constants/scholarshipGpaOptions';
import { DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { normalizeUsStateToCanonical, US_STATE_NAME_TO_CODE } from '@/lib/constants/usStates';
import { getScholarshipCatalog } from '@/lib/scholarships/scholarshipCatalog';
import { buildScholarshipProfileFilterSeed } from '@/lib/scholarships/profileFilterDefaults';
import { parseUserGpa, type ProfilesRow } from '@/lib/scholarships/scholarshipMatch';

/** One dimension contributes 0–20; five dimensions → 0–100 overall. Neutral / missing metadata → 10 each. */
const NEU = 10;
const MAX_D = 20;

function scoreFieldOfStudy(s: Scholarship, userSlug: string | null): number {
  if (!userSlug?.trim()) return NEU;
  const fos = userSlug.trim().toLowerCase();
  const hay = (s.fieldOfStudy ?? []).map((x) => String(x).toLowerCase());
  if (hay.some((x) => x === fos || x.includes(fos) || fos.includes(x))) return MAX_D;
  const blob = [s.title, s.summaryShort].filter(Boolean).join(' ').toLowerCase();
  const spaced = fos.replace(/_/g, ' ');
  if (blob.includes(spaced) || blob.includes(fos)) return 16;
  return 6;
}

function scoreEducation(s: Scholarship, wantIds: string[]): number {
  if (wantIds.length === 0) return NEU;
  const cat = getScholarshipCatalog(s);
  const have = new Set(cat.educationIds);
  if (have.size === 0) return NEU;
  const hit = wantIds.some((id) => have.has(id));
  return hit ? MAX_D : 7;
}

function scoreCitizenship(s: Scholarship, profile: ProfilesRow): number {
  const raw = profile.citizenship_status?.trim().toLowerCase() ?? '';
  if (!raw) return NEU;
  const cit = (s.citizenshipStatuses ?? []).map((x) => String(x).toLowerCase());
  const blob = [
    s.title,
    s.summaryShort,
    s.eligibilityText,
    s.description
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  if (raw === 'international_student') {
    const intl =
      cit.some((c) => c.includes('international')) ||
      /\binternational students?\b|\bforeign students?\b/i.test(blob);
    return intl ? MAX_D : NEU;
  }

  if (raw === DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP) {
    return cit.length === 0 ? MAX_D : 6;
  }

  if (raw === 'us_citizen' || raw === 'us_permanent_resident') {
    const grantIntlOnly =
      cit.length > 0 &&
      cit.every((c) => c.includes('international')) &&
      !cit.some((c) => c === 'us' || c.includes('domestic') || c.includes('citizen'));
    if (grantIntlOnly) return 4;
    const usSig =
      cit.some(
        (c) =>
          c === 'us' ||
          c === 'us_citizen' ||
          c.includes('domestic') ||
          c.includes('permanent')
      );
    return usSig ? MAX_D : 14;
  }
  return NEU;
}

function scoreState(s: Scholarship, profile: ProfilesRow): number {
  const canon = normalizeUsStateToCanonical(profile.state_region?.trim() ?? '');
  if (!canon) return NEU;
  const code = US_STATE_NAME_TO_CODE[canon]?.toUpperCase();
  if (!code) return NEU;
  const codes = (s.stateCodes ?? []).map((c) => String(c).trim().toUpperCase());
  if (codes.length === 0) return NEU;
  return codes.includes(code) ? MAX_D : 8;
}

function scoreGpa(s: Scholarship, profile: ProfilesRow): number {
  const bucketChoice = profileGpaSelectionFromSnapshot(profile.saved_filters_snapshot);
  const userGpa = parseUserGpa(profile.gpa);
  if (bucketChoice) {
    const floor = parseUserGpa(bucketChoice);
    if (floor == null) return NEU;
    const cat = getScholarshipCatalog(s);
    const minReq =
      cat.gpaMin != null && !Number.isNaN(Number(cat.gpaMin))
        ? Number(cat.gpaMin)
        : null;
    if (minReq == null) return 10;
    return minReq + 1e-6 >= floor ? MAX_D : 7;
  }
  if (userGpa == null) return NEU;
  const cat = getScholarshipCatalog(s);
  const minReq =
    cat.gpaMin != null && !Number.isNaN(Number(cat.gpaMin))
      ? Number(cat.gpaMin)
      : null;
  if (minReq == null) return 14;
  return userGpa + 1e-6 >= minReq ? MAX_D : 5;
}

/**
 * Hub “Best / Recommended” soft match score (0–100). Missing grant metadata is neutral (10/20 per axis).
 * Explicit mismatches (e.g. intl-only grant vs domestic profile) reduce the relevant axis only.
 */
export function computeHubProfileMatchPercent(
  s: Scholarship,
  profile: ProfilesRow
): number {
  const seed = buildScholarshipProfileFilterSeed(profile);
  let fosSlug = seed?.fieldOfStudy?.trim().toLowerCase() ?? null;
  if (!fosSlug && profile.field_of_study_label?.trim()) {
    fosSlug = fieldOfStudySlug(profile.field_of_study_label) || null;
  }
  const eduIds = seed?.educationLevelIds ?? [];

  const d1 = scoreFieldOfStudy(s, fosSlug);
  const d2 = scoreEducation(s, eduIds);
  const d3 = scoreCitizenship(s, profile);
  const d4 = scoreState(s, profile);
  const d5 = scoreGpa(s, profile);
  const sum = d1 + d2 + d3 + d4 + d5;
  return Math.max(0, Math.min(100, Math.round(sum)));
}
