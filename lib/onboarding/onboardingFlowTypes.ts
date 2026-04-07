/** Onboarding: basics → state → GPA → account (`5` kept for legacy URLs only; clamped to 4). */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export type OnboardingStep2DraftFields = {
  firstName: string;
  lastName: string;
  email: string;
};

export type OnboardingStep3DraftFields = {
  gpa: string;
};

export type OnboardingStep4DraftFields = {
  /** Raw input; persisted value is canonical full name via `normalizeUsStateToCanonical`. */
  state: string;
};
