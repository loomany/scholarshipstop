export type CountrySignupProfileInput = {
  firstName?: string | null;
  lastName?: string | null;
  birthMonth?: string | number | null;
  birthDay?: number | null;
  birthYear?: number | null;
  dateOfBirth?: string | null;
  schoolLevel?: string | null;
  schoolLevelLabel?: string | null;
  fieldOfStudy?: string | null;
  fieldOfStudyLabel?: string | null;
  citizenshipStatus?: string | null;
  citizenshipStatusLabel?: string | null;
  stateRegion?: string | null;
  gpa?: number | string | null;
  savedFiltersSnapshot?: Record<string, unknown> | null;
  onboardingCompleted?: boolean | null;
  preferredHostCountryCodes?: string[];
  /** Broad browse: no applicant ISO2; hub uses `includeUnspecifiedApplicantCountries`. */
  includeUnspecifiedApplicantCountries?: boolean | null;
};

export type CountrySignupResult =
  | {
      ok: true;
      userId: string;
      createdNewUser: boolean;
      emailSent: boolean;
      signedIn: boolean;
      requiresEmailVerification: boolean;
    }
  | {
      ok: false;
      error: string;
      code?: string;
      signupPath?: string;
    };

export async function createCountryFirstScholarshipAccount(options: {
  email: string;
  countryCode: string | null;
  source: string;
  profile?: CountrySignupProfileInput;
}): Promise<CountrySignupResult> {
  const res = await fetch('/api/onboarding/country-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(options)
  });
  const json = (await res
    .json()
    .catch(() => null)) as Partial<CountrySignupResult> | null;
  if (!res.ok || !json?.ok) {
    const failure = json as {
      error?: string;
      code?: string;
      signupPath?: string;
    } | null;
    return {
      ok: false,
      error:
        typeof failure?.error === 'string'
          ? failure.error
          : 'Could not create your account. Try again in a moment.',
      ...(typeof failure?.code === 'string' ? { code: failure.code } : {}),
      ...(typeof failure?.signupPath === 'string'
        ? { signupPath: failure.signupPath }
        : {})
    };
  }
  const success = json as Extract<CountrySignupResult, { ok: true }>;

  return {
    ok: true,
    userId: success.userId,
    createdNewUser: success.createdNewUser,
    emailSent: success.emailSent,
    signedIn: false,
    requiresEmailVerification: success.requiresEmailVerification === true
  };
}
