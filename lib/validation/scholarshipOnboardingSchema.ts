import type { OnboardingFormValues } from '@/lib/onboarding/scholarshipOnboardingDraft';
import { buildUserProfileFromForm } from '@/lib/onboarding/normalizeScholarshipOnboarding';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import { citizenshipLabelForValue } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  FIELD_OF_STUDY_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  fieldOfStudyLabelForValue,
  schoolLevelLabelForValue
} from '@/lib/constants/scholarshipProfileOptions';
import { isValidCitizenshipSlug } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { validateBirthDateFields } from '@/lib/validation/birthDateFields';

export type ScholarshipOnboardingFieldErrors = Partial<
  Record<
    keyof OnboardingFormValues | 'birthDate' | 'age',
    string
  >
>;

export type ScholarshipOnboardingValidationResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; errors: ScholarshipOnboardingFieldErrors };

const ALLOWED_SCHOOL = new Set(SCHOOL_LEVEL_OPTIONS.map((o) => o.value));
const ALLOWED_FIELD = new Set(FIELD_OF_STUDY_OPTIONS.map((o) => o.value));

export function validateScholarshipOnboarding(
  values: OnboardingFormValues
): ScholarshipOnboardingValidationResult {
  const errors: ScholarshipOnboardingFieldErrors = {
    ...validateBirthDateFields(values, { requireAll: true })
  };
  if (!values.schoolLevel?.trim()) {
    errors.schoolLevel = 'Please select your school level';
  } else if (!ALLOWED_SCHOOL.has(values.schoolLevel)) {
    errors.schoolLevel = 'Please select your school level';
  }
  if (!values.fieldOfStudy?.trim()) {
    errors.fieldOfStudy = 'Please select your field of study';
  } else if (!ALLOWED_FIELD.has(values.fieldOfStudy)) {
    errors.fieldOfStudy = 'Please select your field of study';
  }
  if (!values.citizenship?.trim()) {
    errors.citizenship = 'Please select your citizenship status';
  } else if (!isValidCitizenshipSlug(values.citizenship)) {
    errors.citizenship = 'Please select your citizenship status';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const profile = buildUserProfileFromForm(values, {
    onboardingCompleted: true
  });

  return { ok: true, profile };
}

/**
 * `/get-scholarships` landing quiz: school / field / citizenship only (no DOB).
 */
export function validateScholarshipOnboardingBasicsWithoutBirth(
  values: OnboardingFormValues
): ScholarshipOnboardingValidationResult {
  const errors: ScholarshipOnboardingFieldErrors = {};
  if (!values.schoolLevel?.trim()) {
    errors.schoolLevel = 'Please select your school level';
  } else if (!ALLOWED_SCHOOL.has(values.schoolLevel)) {
    errors.schoolLevel = 'Please select your school level';
  }
  if (!values.fieldOfStudy?.trim()) {
    errors.fieldOfStudy = 'Please select your field of study';
  } else if (!ALLOWED_FIELD.has(values.fieldOfStudy)) {
    errors.fieldOfStudy = 'Please select your field of study';
  }
  if (!values.citizenship?.trim()) {
    errors.citizenship = 'Please select your citizenship status';
  } else if (!isValidCitizenshipSlug(values.citizenship)) {
    errors.citizenship = 'Please select your citizenship status';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const cit = values.citizenship.trim();
  const profile: UserProfile = {
    firstName: null,
    lastName: null,
    birthMonth: null,
    birthDay: null,
    birthYear: null,
    dateOfBirth: null,
    schoolLevel: values.schoolLevel.trim() || null,
    schoolLevelLabel: values.schoolLevel
      ? schoolLevelLabelForValue(values.schoolLevel)
      : null,
    fieldOfStudy: values.fieldOfStudy.trim() || null,
    fieldOfStudyLabel: values.fieldOfStudy
      ? fieldOfStudyLabelForValue(values.fieldOfStudy)
      : null,
    citizenshipStatus: cit || null,
    citizenshipStatusLabel: cit ? citizenshipLabelForValue(cit) : null,
    countryCode: null,
    stateRegion: null,
    city: null,
    gpa: null,
    onboardingCompleted: true
  };

  return { ok: true, profile };
}
