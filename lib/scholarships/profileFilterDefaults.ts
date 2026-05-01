import {
  cloneMoreFilters,
  defaultMoreFiltersFromBounds,
  type MoreFiltersState,
  type ProfileCitizenshipNarrow
} from '@/app/scholarships/moreFilters';
import type { ScholarshipListTabId } from '@/app/scholarships/scholarshipTabs';
import { fieldOfStudySlug } from '@/lib/constants/scholarshipFieldOfStudyOptions';
import {
  isGpaBucketChoice,
  PROFILE_GPA_SELECTION_SNAPSHOT_KEY,
  gpaForProfile,
  gpaForProfileDb,
  profileGpaSelectionFromSnapshot
} from '@/lib/constants/scholarshipGpaOptions';
import {
  DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP,
  isValidCitizenshipSlug
} from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS
} from '@/lib/constants/scholarshipProfileOptions';
import { normalizeUsStateToCanonical } from '@/lib/constants/usStates';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import { parseUserGpa, type ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import { validateScholarshipOnboardingBasicsOptionalWithoutBirth, validateScholarshipOnboardingBasicsWithoutBirth } from '@/lib/validation/scholarshipOnboardingSchema';
import { validateScholarshipOnboardingStep3GpaOptional } from '@/lib/validation/scholarshipOnboardingStep3Schema';
import { validateScholarshipOnboardingStep4Draft } from '@/lib/validation/scholarshipOnboardingStep4Schema';

export type ScholarshipProfileFilterSeed = {
  fieldOfStudy: string | null;
  schoolLevel: string | null;
  citizenship: string | null;
  applicantCountryCodes?: string[];
  stateInput: string;
  gpa?: ProfilesRow['gpa'] | null;
  gpaSelection?: string | null;
  educationLevelIds: string[];
  gpaBucketIds: string[];
  eligibilityIds: string[];
};

export function buildScholarshipProfileFilterSeedFromCountry(
  countryCode: string
): ScholarshipProfileFilterSeed | null {
  const normalized = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return {
    fieldOfStudy: null,
    schoolLevel: null,
    citizenship: null,
    applicantCountryCodes: [normalized],
    stateInput: '',
    gpa: null,
    gpaSelection: null,
    educationLevelIds: [],
    gpaBucketIds: [],
    eligibilityIds: []
  };
}

/**
 * Scholarship `gpa_bucket` stores the award's **minimum** GPA bar (see `gpaMinToBucketId`
 * in scholarshipCatalog). Listing SQL uses `IN (...)`, so we must pass every bucket the
 * applicant clears — e.g. a 3.7 GPA must match rows tagged `gpa_3_0_plus`, not only `gpa_3_5_plus`.
 * Always include `no_gpa_requirement` for awards with no stated bar.
 */
function gpaBucketIdsFromProfile(profile: Pick<ProfilesRow, 'gpa' | 'saved_filters_snapshot'>): string[] {
  const bucketChoice = profileGpaSelectionFromSnapshot(profile.saved_filters_snapshot);
  if (bucketChoice === 'gpa_2_0_plus') {
    return ['gpa_2_0_plus', 'gpa_2_5_plus', 'gpa_3_0_plus', 'gpa_3_5_plus'];
  }
  if (bucketChoice === 'gpa_2_5_plus') {
    return ['gpa_2_5_plus', 'gpa_3_0_plus', 'gpa_3_5_plus'];
  }
  if (bucketChoice === 'gpa_3_0_plus') {
    return ['gpa_3_0_plus', 'gpa_3_5_plus'];
  }
  if (bucketChoice === 'gpa_3_5_plus') {
    return ['gpa_3_5_plus'];
  }
  const gpa = parseUserGpa(profile.gpa);
  if (gpa == null) return [];
  const out: string[] = ['no_gpa_requirement'];
  if (gpa >= 2.0) out.push('gpa_2_0_plus');
  if (gpa >= 2.5) out.push('gpa_2_5_plus');
  if (gpa >= 3.0) out.push('gpa_3_0_plus');
  if (gpa >= 3.5) out.push('gpa_3_5_plus');
  return out;
}

function educationLevelIdsFromProfileSchoolLevel(
  schoolLevel: string | null | undefined
): string[] {
  const raw = schoolLevel?.trim() ?? '';
  if (!raw) return [];
  if (raw === 'high_school_senior') {
    return ['high_school_senior', 'high_school'];
  }
  if (raw.startsWith('high_school_')) {
    return ['high_school'];
  }
  if (raw.startsWith('college_')) {
    return ['undergraduate'];
  }
  if (raw === 'graduate_student') {
    return ['graduate'];
  }
  return [];
}

/**
 * Eligibility-tag include list from citizenship only for cases where a concrete tag exists.
 * International students: do **not** require `eligibility_tags` @ `international_students` — in prod
 * that tag is rare (~0.5% of rows); use `citizenshipAudience: international_friendly` instead (see
 * `buildMoreFiltersWithProfileDefaults`).
 */
function eligibilityIdsFromProfileCitizenship(
  citizenship: string | null | undefined
): string[] {
  const raw = citizenship?.trim() ?? '';
  if (raw === 'international_student') {
    return [];
  }
  return [];
}

function profileCitizenshipNarrowFromCitizenship(
  citizenship: string | null | undefined
): ProfileCitizenshipNarrow {
  const raw = citizenship?.trim().toLowerCase() ?? '';
  if (raw === DOMESTIC_OR_UNSPECIFIED_CITIZENSHIP) return 'none';
  if (raw === 'us_citizen' || raw === 'us_permanent_resident') return 'us_domestic';
  return 'none';
}

function resolvedFieldOfStudySlugFromProfile(profile: ProfilesRow): string | null {
  let slug = profile.field_of_study?.trim().toLowerCase() || null;
  if (!slug && profile.field_of_study_label?.trim()) {
    slug = fieldOfStudySlug(profile.field_of_study_label) || null;
  }
  return slug;
}

/**
 * Builds the same filter seed shape as a saved profile, from the `/get-scholarships`
 * landing quiz draft (no account step). Used for guest redirect to `/scholarships`.
 */
export function buildScholarshipProfileFilterSeedFromDraftWithoutBirth(
  draft: StoredOnboardingDraft
): ScholarshipProfileFilterSeed | null {
  if (!validateScholarshipOnboardingBasicsOptionalWithoutBirth(draft.step1).ok) return null;
  if (!validateScholarshipOnboardingStep3GpaOptional(draft.step3).ok) return null;

  const stateInput =
    normalizeUsStateToCanonical(draft.step4.state.trim()) ?? '';
  if (draft.step4.state.trim() && !stateInput) {
    return null;
  }

  const fieldOfStudy = draft.step1.fieldOfStudy.trim() || null;
  const schoolLevel = draft.step1.schoolLevel.trim() || null;
  const citizenship = draft.step1.citizenship.trim() || null;
  const educationLevelIds = educationLevelIdsFromProfileSchoolLevel(schoolLevel);
  const gpaChoice = gpaForProfile(draft.step3.gpa);
  const gpaNum = gpaForProfileDb(gpaChoice);
  const gpaSelection = isGpaBucketChoice(gpaChoice) ? gpaChoice : null;
  const gpaBucketIds = gpaBucketIdsFromProfile({
    gpa: gpaNum,
    saved_filters_snapshot: gpaSelection
      ? { [PROFILE_GPA_SELECTION_SNAPSHOT_KEY]: gpaSelection }
      : null
  });
  const eligibilityIds = eligibilityIdsFromProfileCitizenship(citizenship);

  return {
    fieldOfStudy,
    schoolLevel,
    citizenship,
    applicantCountryCodes: [],
    stateInput,
    gpa: gpaNum,
    gpaSelection,
    educationLevelIds,
    gpaBucketIds,
    eligibilityIds
  };
}

const ALLOWED_WIZARD_SCHOOL = new Set(
  SCHOOL_LEVEL_OPTIONS.map((o) => o.value)
);
const ALLOWED_WIZARD_FIELD = new Set(
  FIELD_OF_STUDY_OPTIONS.map((o) => o.value)
);

/**
 * Lenient Hub guest preview: merges only valid wizard fields so partial drafts
 * still produce a usable seed without requiring submit or rejecting the whole draft.
 */
export function buildScholarshipProfileFilterSeedFromWizardDraftForGuestPreview(
  draft: StoredOnboardingDraft
): ScholarshipProfileFilterSeed | null {
  const schoolRaw = draft.step1.schoolLevel.trim();
  const schoolLevel =
    schoolRaw && ALLOWED_WIZARD_SCHOOL.has(schoolRaw) ? schoolRaw : null;

  const fieldRaw = draft.step1.fieldOfStudy.trim();
  const fieldOfStudy =
    fieldRaw && ALLOWED_WIZARD_FIELD.has(fieldRaw) ? fieldRaw : null;

  const citRaw = draft.step1.citizenship.trim();
  const citizenship =
    citRaw && isValidCitizenshipSlug(citRaw) ? citRaw : null;

  let stateInput = '';
  const trimmedState = draft.step4.state.trim();
  if (trimmedState) {
    const canon = normalizeUsStateToCanonical(trimmedState);
    if (canon) stateInput = canon;
  }

  let gpaNum: ProfilesRow['gpa'] | null = null;
  let gpaSelection: string | null = null;
  let gpaBucketIds: string[] = [];
  if (validateScholarshipOnboardingStep3GpaOptional(draft.step3).ok) {
    const gpaChoice = gpaForProfile(draft.step3.gpa);
    const n = gpaForProfileDb(gpaChoice);
    gpaSelection = isGpaBucketChoice(gpaChoice) ? gpaChoice : null;
    gpaNum = n ?? null;
    gpaBucketIds = gpaBucketIdsFromProfile({
      gpa: n,
      saved_filters_snapshot: gpaSelection
        ? { [PROFILE_GPA_SELECTION_SNAPSHOT_KEY]: gpaSelection }
        : null
    });
  }

  const educationLevelIds =
    educationLevelIdsFromProfileSchoolLevel(schoolLevel);
  const eligibilityIds = eligibilityIdsFromProfileCitizenship(citizenship);

  if (
    !fieldOfStudy &&
    !schoolLevel &&
    !citizenship &&
    !stateInput &&
    gpaNum == null &&
    !gpaSelection &&
    educationLevelIds.length === 0 &&
    gpaBucketIds.length === 0 &&
    eligibilityIds.length === 0
  ) {
    return null;
  }

  return {
    fieldOfStudy,
    schoolLevel,
    citizenship,
    stateInput,
    gpa: gpaNum,
    gpaSelection,
    educationLevelIds,
    gpaBucketIds,
    eligibilityIds
  };
}

export function buildScholarshipProfileFilterSeedFromQuizDraft(
  draft: StoredOnboardingDraft
): ScholarshipProfileFilterSeed | null {
  if (draft.quizVariant !== 'landing_no_birth') return null;
  if (!validateScholarshipOnboardingBasicsOptionalWithoutBirth(draft.step1).ok) return null;
  if (!validateScholarshipOnboardingStep4Draft(draft.step4).ok) return null;
  if (!validateScholarshipOnboardingStep3GpaOptional(draft.step3).ok) return null;
  return buildScholarshipProfileFilterSeedFromDraftWithoutBirth(draft);
}

export function buildScholarshipProfileFilterSeed(
  profile: ProfilesRow | null
): ScholarshipProfileFilterSeed | null {
  if (!profile) return null;

  const fieldOfStudy = resolvedFieldOfStudySlugFromProfile(profile);
  const schoolLevel = profile.school_level?.trim() || null;
  const citizenship = profile.citizenship_status?.trim() || null;
  const stateInput = normalizeUsStateToCanonical(profile.state_region?.trim() ?? '') ?? '';
  const countryCode =
    typeof profile.country_code === 'string' && /^[A-Z]{2}$/i.test(profile.country_code.trim())
      ? profile.country_code.trim().toUpperCase()
      : null;
  const educationLevelIds = educationLevelIdsFromProfileSchoolLevel(schoolLevel);
  const gpaSelection = profileGpaSelectionFromSnapshot(profile.saved_filters_snapshot);
  const gpaBucketIds = gpaBucketIdsFromProfile(profile);
  const eligibilityIds = eligibilityIdsFromProfileCitizenship(citizenship);

  if (
    !fieldOfStudy &&
    !schoolLevel &&
    !citizenship &&
    !countryCode &&
    !stateInput &&
    profile.gpa == null &&
    !gpaSelection &&
    educationLevelIds.length === 0 &&
    gpaBucketIds.length === 0 &&
    eligibilityIds.length === 0
  ) {
    return null;
  }

  return {
    fieldOfStudy,
    schoolLevel,
    citizenship,
    applicantCountryCodes: countryCode ? [countryCode] : [],
    stateInput,
    gpa: profile.gpa ?? null,
    gpaSelection,
    educationLevelIds,
    gpaBucketIds,
    eligibilityIds
  };
}

export function buildMoreFiltersWithProfileDefaults(
  bounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  },
  seed: ScholarshipProfileFilterSeed | null | undefined
): MoreFiltersState {
  const next = defaultMoreFiltersFromBounds(bounds);
  if (!seed) return next;

  next.filterStateInput = seed.stateInput;
  next.includeEducationLevels = new Set(seed.educationLevelIds);
  next.includeGpaBuckets = new Set(seed.gpaBucketIds);
  next.includeEligibility = new Set(seed.eligibilityIds);
  if (seed.applicantCountryCodes?.length) {
    next.includeApplicantCountryCodes = new Set(
      seed.applicantCountryCodes
        .map((code) => code.trim().toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code))
    );
    next.includeUnspecifiedApplicantCountries = false;
  }
  next.profileFieldOfStudySlug = seed.fieldOfStudy?.trim().toLowerCase() ?? '';
  next.profileCitizenshipNarrow = profileCitizenshipNarrowFromCitizenship(
    seed.citizenship
  );
  if (seed.citizenship?.trim().toLowerCase() === 'international_student') {
    next.citizenshipAudience = 'international_friendly';
  }
  return next;
}

/**
 * Best recommendation / Recommended: apply cabinet (profile) facets to the listing SQL when the user
 * has not chosen a stricter value in the hub UI. Missing profile fields produce no seed slice,
 * so those dimensions stay open (wider results).
 */
/**
 * Clears hub dimensions that were previously injected from the cabinet profile / quiz
 * into `moreFilters` for hard SQL narrowing. Used for Best / Recommended listing so the
 * catalog stays wide; match quality moves to `computeHubProfileMatchPercent` ranking.
 */
export function stripHubProfileHardMatchMoreFilters(
  mf: MoreFiltersState
): MoreFiltersState {
  const out = cloneMoreFilters(mf);
  out.includeEducationLevels = new Set();
  out.includeGpaBuckets = new Set();
  out.includeEligibility = new Set();
  out.filterStateInput = '';
  out.profileFieldOfStudySlug = '';
  out.profileCitizenshipNarrow = 'none';
  out.citizenshipAudience = 'any';
  return out;
}

export function mergeBestRecommendationFiltersFromProfile(
  tab: ScholarshipListTabId,
  moreFilters: MoreFiltersState,
  seed: ScholarshipProfileFilterSeed | null,
  bounds: {
    amountMin: number;
    amountMax: number;
    applicantsMin: number;
    applicantsMax: number;
  }
): MoreFiltersState {
  const out = cloneMoreFilters(moreFilters);
  if ((tab !== 'best-recommendation' && tab !== 'recommended') || !seed) {
    return out;
  }

  const prof = buildMoreFiltersWithProfileDefaults(bounds, seed);
  const autoProfileCitizenshipSqlNarrowAllowed = tab !== 'best-recommendation';

  if (!out.filterStateInput.trim() && prof.filterStateInput.trim()) {
    out.filterStateInput = prof.filterStateInput;
  }
  if (out.includeEducationLevels.size === 0 && prof.includeEducationLevels.size > 0) {
    out.includeEducationLevels = new Set(prof.includeEducationLevels);
  }
  if (out.includeGpaBuckets.size === 0 && prof.includeGpaBuckets.size > 0) {
    out.includeGpaBuckets = new Set(prof.includeGpaBuckets);
  }
  if (out.includeEligibility.size === 0 && prof.includeEligibility.size > 0) {
    out.includeEligibility = new Set(prof.includeEligibility);
  }
  if (
    out.includeApplicantCountryCodes.size === 0 &&
    prof.includeApplicantCountryCodes.size > 0
  ) {
    out.includeApplicantCountryCodes = new Set(prof.includeApplicantCountryCodes);
    out.includeUnspecifiedApplicantCountries =
      prof.includeUnspecifiedApplicantCountries;
  }
  if (!out.profileFieldOfStudySlug.trim() && prof.profileFieldOfStudySlug.trim()) {
    out.profileFieldOfStudySlug = prof.profileFieldOfStudySlug;
  }
  if (
    autoProfileCitizenshipSqlNarrowAllowed &&
    out.profileCitizenshipNarrow === 'none' &&
    prof.profileCitizenshipNarrow !== 'none'
  ) {
    out.profileCitizenshipNarrow = prof.profileCitizenshipNarrow;
  }
  if (
    autoProfileCitizenshipSqlNarrowAllowed &&
    out.citizenshipAudience === 'any' &&
    prof.citizenshipAudience !== 'any'
  ) {
    out.citizenshipAudience = prof.citizenshipAudience;
  }

  return out;
}
