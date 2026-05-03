import { createClient } from '@/utils/supabase/client';

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
    }
  | {
      ok: false;
      error: string;
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
  const json = (await res.json().catch(() => null)) as Partial<CountrySignupResult> | null;
  if (!res.ok || !json?.ok) {
    return {
      ok: false,
      error:
        json && 'error' in json && typeof json.error === 'string'
          ? json.error
          : 'Could not create your account. Try again in a moment.'
    };
  }
  const success = json as Extract<
    CountrySignupResult,
    { ok: true }
  > & { sessionPassword?: string | null };

  let signedIn = false;
  if (success.sessionPassword) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: options.email.trim().toLowerCase(),
      password: success.sessionPassword
    });
    if (!error) {
      signedIn = true;
    } else {
      console.warn('[country-signup] automatic sign-in failed', error.message);
    }
  } else if (!success.createdNewUser) {
    const supabase = createClient();
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (session?.user.id === success.userId) {
      signedIn = true;
    } else {
      return {
        ok: false,
        error:
          'This email already has an account. Please sign in with that email to continue.'
      };
    }
  }

  return {
    ok: true,
    userId: success.userId,
    createdNewUser: success.createdNewUser,
    emailSent: success.emailSent,
    signedIn
  };
}
