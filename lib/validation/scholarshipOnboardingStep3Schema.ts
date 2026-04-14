import {
  isValidGpaValue,
  SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY
} from '@/lib/constants/scholarshipGpaOptions';

/** Step 3 (GPA) — required; must be a known numeric GPA. */
export type Step3GpaFormValues = {
  gpa: string;
};

export type Step3GpaFieldErrors = Partial<
  Record<keyof Step3GpaFormValues | 'submit', string>
>;

export type Step3GpaValidationResult =
  | { ok: true }
  | { ok: false; errors: Step3GpaFieldErrors };

export function validateScholarshipOnboardingStep3Gpa(
  values: Step3GpaFormValues
): Step3GpaValidationResult {
  const errors: Step3GpaFieldErrors = {};
  const g = values.gpa.trim();
  if (!g || g === SCHOLARSHIP_GPA_PREFER_NOT_TO_SAY) {
    errors.gpa = 'Please select your GPA';
  } else if (!isValidGpaValue(g)) {
    errors.gpa = 'Please select a valid GPA';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
