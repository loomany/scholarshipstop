import { isValidGpaValue } from '@/lib/constants/scholarshipGpaOptions';

/** Step 3 (GPA) — optional; non-empty must be a known value or `prefer_not_to_say`. */
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
  if (g && !isValidGpaValue(g)) {
    errors.gpa = 'Please select a valid GPA';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
