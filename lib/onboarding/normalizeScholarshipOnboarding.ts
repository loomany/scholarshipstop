import { citizenshipLabelForValue } from '@/lib/constants/onboardingCitizenshipAndLocation';
import {
  fieldOfStudyLabelForValue,
  schoolLevelLabelForValue
} from '@/lib/constants/scholarshipProfileOptions';
import type { OnboardingFormValues } from '@/lib/onboarding/scholarshipOnboardingDraft';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import {
  composeBirthDateValue,
  parseBirthDayValue,
  parseBirthMonthValue,
  parseBirthYearValue
} from '@/lib/validation/birthDateFields';

export function buildUserProfileFromForm(
  values: OnboardingFormValues,
  options: { onboardingCompleted: boolean }
): UserProfile {
  const monthValue = parseBirthMonthValue(values.birthMonth);
  const dayValue = parseBirthDayValue(values.birthDay);
  const yearValue = parseBirthYearValue(values.birthYear);
  const dateOfBirth = composeBirthDateValue(monthValue, dayValue, yearValue);
  const cit = values.citizenship.trim();
  return {
    firstName: null,
    lastName: null,
    birthMonth: monthValue,
    birthDay: dayValue,
    birthYear: yearValue,
    dateOfBirth,
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
    onboardingCompleted: options.onboardingCompleted
  };
}
