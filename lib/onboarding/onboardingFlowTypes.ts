/** Onboarding URL/local step index (country-first: 1 = country, 2 = account; 3–7 = legacy URLs/drafts). */
export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type OnboardingStep2DraftFields = {
  firstName: string;
  lastName: string;
  email: string;
};

export type OnboardingStep3DraftFields = {
  gpa: string;
};

export type OnboardingStep4DraftFields = {
  /** ISO-3166 alpha-2 country selected before the registration flow branches. */
  countryCode?: string;
  /** Raw input; persisted value is canonical full name via `normalizeUsStateToCanonical`. */
  state: string;
};
