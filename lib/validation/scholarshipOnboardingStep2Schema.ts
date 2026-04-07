import type { OnboardingStep2DraftFields } from '@/lib/onboarding/onboardingFlowTypes';
import { getPasswordPolicyError } from '@/lib/validation/passwordPolicy';

export type Step2FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type Step2FieldErrors = Partial<
  Record<keyof Step2FormValues | 'submit', string>
>;

export type Step2ValidationResult =
  | { ok: true }
  | { ok: false; errors: Step2FieldErrors };

export type Step2DraftFieldErrors = Partial<
  Record<keyof OnboardingStep2DraftFields, string>
>;

export type Step2DraftValidationResult =
  | { ok: true }
  | { ok: false; errors: Step2DraftFieldErrors };

const EMAIL_RE =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Names + email only (saved to localStorage draft). */
export function validateScholarshipOnboardingStep2Draft(
  s2: OnboardingStep2DraftFields
): Step2DraftValidationResult {
  const errors: Step2DraftFieldErrors = {};
  if (!s2.firstName.trim()) {
    errors.firstName = 'Please enter your first name';
  }
  if (!s2.lastName.trim()) {
    errors.lastName = 'Please enter your last name';
  }
  const email = s2.email.trim();
  if (!email) {
    errors.email = 'Please enter a valid email';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email';
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

/** Full step 2 including password (in-memory only until final signup). */
export function validateScholarshipOnboardingStep2(
  values: Step2FormValues
): Step2ValidationResult {
  const draft = validateScholarshipOnboardingStep2Draft({
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email
  });
  const errors: Step2FieldErrors = draft.ok ? {} : { ...draft.errors };

  const pwdMsg = getPasswordPolicyError(values.password);
  if (pwdMsg) {
    errors.password = pwdMsg;
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}
