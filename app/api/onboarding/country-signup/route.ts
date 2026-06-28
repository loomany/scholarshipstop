import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

import { sendRegistrationVerificationEmail } from '@/lib/email/sendRegistrationVerificationEmail';
import { gpaForProfileDb } from '@/lib/constants/scholarshipGpaOptions';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';
import {
  consumeCountrySignupRateLimit,
  getCountrySignupClientIp
} from '@/lib/security/countrySignupRateLimit';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import type { Database, Json } from '@/types_db';
import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type SignupProfileInput = {
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
  includeUnspecifiedApplicantCountries?: boolean | null;
};

type CountrySignupPayload = {
  email?: string;
  /** ISO2 applicant country; omit or null when `profile.includeUnspecifiedApplicantCountries` is true. */
  countryCode?: string | null;
  source?: string;
  profile?: SignupProfileInput;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

const EXISTING_EMAIL_MESSAGE =
  'This email already has an account. Please sign in with that email to continue.';
const COUNTRY_SIGNUP_SESSION_COOKIE = 'st_country_signup_session';
const COUNTRY_SIGNUP_DISABLED_MESSAGE =
  'For your security, continue with the standard sign-up form.';

function isCreateUserDuplicateEmailError(
  error: { message?: string; code?: string } | null
): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('already') ||
    message.includes('exists') ||
    message.includes('registered') ||
    error?.code === 'email_exists'
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[invalid-email]';
  const prefix = local.slice(0, 2);
  return `${prefix}***@${domain}`;
}

function readCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get('cookie') ?? '';
  for (const part of cookies.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

function normalizeStudyDestinationCodes(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const next = [
    ...new Set(
      raw
        .map((x) => (typeof x === 'string' ? x.trim().toUpperCase() : ''))
        .filter((c) => /^[A-Z]{2}$/.test(c))
    )
  ];
  return next;
}

function buildScholarshipProfileMetadata(
  profile: SignupProfileInput,
  countryCode: string | null
) {
  const gpa =
    typeof profile.gpa === 'number'
      ? profile.gpa
      : gpaForProfileDb(profile.gpa == null ? null : String(profile.gpa));
  const pref = normalizeStudyDestinationCodes(
    profile.preferredHostCountryCodes
  );
  return {
    firstName: nonEmptyString(profile.firstName) ?? null,
    lastName: nonEmptyString(profile.lastName) ?? null,
    birthMonth: profile.birthMonth != null ? String(profile.birthMonth) : null,
    birthDay: typeof profile.birthDay === 'number' ? profile.birthDay : null,
    birthYear: typeof profile.birthYear === 'number' ? profile.birthYear : null,
    dateOfBirth: nonEmptyString(profile.dateOfBirth) ?? null,
    schoolLevel: nonEmptyString(profile.schoolLevel) ?? null,
    schoolLevelLabel: nonEmptyString(profile.schoolLevelLabel) ?? null,
    fieldOfStudy: nonEmptyString(profile.fieldOfStudy) ?? null,
    fieldOfStudyLabel: nonEmptyString(profile.fieldOfStudyLabel) ?? null,
    citizenshipStatus: nonEmptyString(profile.citizenshipStatus) ?? null,
    citizenshipStatusLabel:
      nonEmptyString(profile.citizenshipStatusLabel) ?? null,
    countryCode: countryCode ?? null,
    stateRegion: nonEmptyString(profile.stateRegion) ?? null,
    city: null,
    gpa,
    savedFiltersSnapshot: profile.savedFiltersSnapshot ?? null,
    onboardingCompleted: profile.onboardingCompleted === true,
    emailVerified: false,
    ...(pref?.length ? { preferredHostCountryCodes: pref } : {})
  };
}

function buildProfilesUpsert(
  userId: string,
  profile: SignupProfileInput,
  countryCode: string | null,
  createdNewUser: boolean
): Database['public']['Tables']['profiles']['Insert'] {
  const row: Database['public']['Tables']['profiles']['Insert'] = {
    id: userId,
    country_code: countryCode ?? null,
    email_notify_best_matches: true,
    email_notify_saved_filters: true,
    email_notify_easy_apply: true,
    email_notify_hot_deadlines: true,
    updated_at: new Date().toISOString()
  };

  if (createdNewUser) row.email_verified = false;
  if (profile.onboardingCompleted != null) {
    row.onboarding_completed = profile.onboardingCompleted;
  }

  const firstName = nonEmptyString(profile.firstName);
  if (firstName) row.first_name = firstName;
  const lastName = nonEmptyString(profile.lastName);
  if (lastName) row.last_name = lastName;
  const birthMonth =
    profile.birthMonth != null ? String(profile.birthMonth).trim() : '';
  if (birthMonth) row.birth_month = birthMonth;
  if (typeof profile.birthDay === 'number') row.birth_day = profile.birthDay;
  if (typeof profile.birthYear === 'number') row.birth_year = profile.birthYear;
  const dateOfBirth = nonEmptyString(profile.dateOfBirth);
  if (dateOfBirth) row.date_of_birth = dateOfBirth;
  const schoolLevel = nonEmptyString(profile.schoolLevel);
  if (schoolLevel) row.school_level = schoolLevel;
  const schoolLevelLabel = nonEmptyString(profile.schoolLevelLabel);
  if (schoolLevelLabel) row.school_level_label = schoolLevelLabel;
  const fieldOfStudy = nonEmptyString(profile.fieldOfStudy);
  if (fieldOfStudy) row.field_of_study = fieldOfStudy;
  const fieldOfStudyLabel = nonEmptyString(profile.fieldOfStudyLabel);
  if (fieldOfStudyLabel) row.field_of_study_label = fieldOfStudyLabel;
  const citizenshipStatus = nonEmptyString(profile.citizenshipStatus);
  if (citizenshipStatus) row.citizenship_status = citizenshipStatus;
  const citizenshipStatusLabel = nonEmptyString(profile.citizenshipStatusLabel);
  if (citizenshipStatusLabel)
    row.citizenship_status_label = citizenshipStatusLabel;
  const stateRegion = nonEmptyString(profile.stateRegion);
  if (stateRegion) row.state_region = stateRegion;
  const gpa =
    typeof profile.gpa === 'number'
      ? profile.gpa
      : gpaForProfileDb(profile.gpa == null ? null : String(profile.gpa));
  if (gpa != null) row.gpa = gpa;
  if (profile.savedFiltersSnapshot) {
    row.saved_filters_snapshot = profile.savedFiltersSnapshot as Json;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      profile,
      'preferredHostCountryCodes'
    ) &&
    profile.preferredHostCountryCodes !== undefined &&
    profile.preferredHostCountryCodes !== null
  ) {
    const hosts =
      normalizeStudyDestinationCodes(profile.preferredHostCountryCodes) ?? [];
    row.preferred_host_country_codes = hosts as unknown as Json;
  }

  return row;
}

function isMissingProfileCountryCode(
  error: { message?: string; code?: string } | null
): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    error?.code === 'PGRST204' &&
    message.includes('country_code') &&
    message.includes('schema cache')
  );
}

async function upsertProfileWithSchemaFallback(
  admin: NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>,
  row: Database['public']['Tables']['profiles']['Insert']
) {
  const first = await admin
    .schema('public')
    .from('profiles')
    .upsert(row, { onConflict: 'id' });

  if (!isMissingProfileCountryCode(first.error)) {
    return first;
  }

  console.warn(
    '[country-signup] profiles.country_code missing from schema cache; retrying without country_code'
  );
  const fallbackRow = { ...row };
  delete fallbackRow.country_code;
  return admin
    .schema('public')
    .from('profiles')
    .upsert(fallbackRow, { onConflict: 'id' });
}

export async function POST(request: Request) {
  const reqId = randomUUID().slice(0, 8);
  const requestStart = Date.now();
  const phaseMs = {
    find: 0,
    create: 0,
    upsert: 0
  };
  const phaseStart = {
    find: 0,
    create: 0,
    upsert: 0
  };
  const beginPhase = (name: keyof typeof phaseMs) => {
    phaseStart[name] = Date.now();
  };
  const endPhase = (name: keyof typeof phaseMs) => {
    phaseMs[name] = Date.now() - phaseStart[name];
  };

  const logResponseEnd = (
    status: number,
    details?: Record<string, unknown>
  ) => {
    const country_signup_total_ms = Date.now() - requestStart;
    console.info('[country-signup] response_end', {
      reqId,
      status,
      country_signup_total_ms,
      phase_ms: phaseMs,
      ...(details ?? {})
    });
  };

  const payload = (await request
    .json()
    .catch(() => null)) as CountrySignupPayload | null;
  const email = payload?.email?.trim().toLowerCase() ?? '';
  const maskedEmail = maskEmail(email);
  const existingAnonymousSession = readCookie(
    request,
    COUNTRY_SIGNUP_SESSION_COOKIE
  );
  const anonymousSession = existingAnonymousSession || randomUUID();
  const respond = (
    body: Record<string, unknown>,
    status: number,
    retryAfter?: number
  ) => {
    const response = NextResponse.json(body, { status });
    response.headers.set('Cache-Control', 'private, no-store');
    if (retryAfter) response.headers.set('Retry-After', String(retryAfter));
    if (!existingAnonymousSession) {
      response.cookies.set({
        name: COUNTRY_SIGNUP_SESSION_COOKIE,
        value: anonymousSession,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 24 * 60 * 60
      });
    }
    return response;
  };
  const source = payload?.source?.trim() || 'country-signup';
  const profile = payload?.profile ?? {};
  const unspecifiedApplicant =
    profile.includeUnspecifiedApplicantCountries === true ||
    (profile.savedFiltersSnapshot &&
      typeof profile.savedFiltersSnapshot === 'object' &&
      !Array.isArray(profile.savedFiltersSnapshot) &&
      (profile.savedFiltersSnapshot as Record<string, unknown>)
        .includeUnspecifiedApplicantCountries === true);
  const countryCode = unspecifiedApplicant
    ? null
    : normalizeCountryCode(
        typeof payload?.countryCode === 'string' ? payload.countryCode : ''
      );

  const rateLimit = consumeCountrySignupRateLimit({
    ip: getCountrySignupClientIp(request.headers),
    email: email || '[invalid-email]',
    sessionId: anonymousSession
  });
  if (!rateLimit.allowed) {
    console.warn('[country-signup] rate_limited', {
      reqId,
      emailHash: rateLimit.emailHash,
      retryAfterSeconds: rateLimit.retryAfterSeconds
    });
    logResponseEnd(429, {
      reason: 'rate_limited',
      emailHash: rateLimit.emailHash
    });
    return respond(
      { ok: false, error: 'Too many sign-up attempts. Try again later.' },
      429,
      rateLimit.retryAfterSeconds
    );
  }

  if (!isValidEmail(email)) {
    logResponseEnd(400, { reason: 'invalid_email' });
    return respond({ ok: false, error: 'Enter a valid email address.' }, 400);
  }
  if (!countryCode && !unspecifiedApplicant) {
    logResponseEnd(400, { reason: 'invalid_country', email: maskedEmail });
    return respond({ ok: false, error: 'Choose a valid country.' }, 400);
  }

  const {
    data: { user: sessionUser }
  } = await createServerSupabaseClient().auth.getUser();
  const isAuthenticatedOwner =
    Boolean(sessionUser?.id) &&
    sessionUser?.email?.trim().toLowerCase() === email;

  if (
    !isAuthenticatedOwner &&
    process.env.COUNTRY_SIGNUP_MODE?.trim() !== 'email_verification'
  ) {
    logResponseEnd(503, {
      reason: 'secure_signup_disabled',
      emailHash: rateLimit.emailHash
    });
    return respond(
      {
        ok: false,
        code: 'COUNTRY_SIGNUP_DISABLED',
        error: COUNTRY_SIGNUP_DISABLED_MESSAGE,
        signupPath: '/signin/signup'
      },
      503
    );
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    logResponseEnd(500, { reason: 'missing_admin_client', email: maskedEmail });
    return respond(
      { ok: false, error: 'Server signup is not configured.' },
      500
    );
  }

  const metadata = buildScholarshipProfileMetadata(profile, countryCode);
  let createdNewUser = false;
  let userId: string | null = null;

  console.info('[country-signup] request_start', { reqId, email: maskedEmail });
  console.info('[country-signup] before_find_user', {
    reqId,
    strategy: 'create_first_duplicate_handling'
  });
  beginPhase('find');
  // find phase intentionally avoids scanning Auth users list for performance.
  endPhase('find');
  console.info('[country-signup] after_find_user', {
    reqId,
    strategy: 'create_first_duplicate_handling',
    scanned: false
  });

  if (isAuthenticatedOwner && sessionUser?.id) {
    userId = sessionUser.id;
  } else {
    console.info('[country-signup] before_create_user', {
      reqId,
      email: maskedEmail
    });
    beginPhase('create');
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          signup_source: source,
          scholarship_profile: JSON.stringify(metadata)
        }
      });
    endPhase('create');
    console.info('[country-signup] after_create_user', {
      reqId,
      created: Boolean(created.user?.id),
      error: createError?.message ?? null
    });

    if (created.user?.id) {
      createdNewUser = true;
      userId = created.user.id;
    } else if (createError) {
      if (!isCreateUserDuplicateEmailError(createError)) {
        console.error('[country-signup] createUser failed', {
          reqId,
          message: createError.message,
          code: createError.code ?? null
        });
        const status =
          createError.message === 'Internal Server Error' ? 409 : 400;
        logResponseEnd(status, {
          reason: 'create_user_failed',
          email: maskedEmail
        });
        return respond(
          {
            ok: false,
            error:
              createError.message === 'Internal Server Error'
                ? 'This email may already have an account. Please sign in with that email or try another email.'
                : createError.message || 'Could not create account.'
          },
          status
        );
      }
      logResponseEnd(409, { reason: 'duplicate_email', email: maskedEmail });
      return respond({ ok: false, error: EXISTING_EMAIL_MESSAGE }, 409);
    }
  }

  if (!userId) {
    logResponseEnd(500, { reason: 'missing_user_id', email: maskedEmail });
    return respond({ ok: false, error: 'Could not create account.' }, 500);
  }

  const row = buildProfilesUpsert(userId, profile, countryCode, createdNewUser);
  console.info('[country-signup] before_profile_upsert', {
    reqId,
    createdNewUser
  });
  beginPhase('upsert');
  const { error: profileError } = await upsertProfileWithSchemaFallback(
    admin,
    row
  );
  endPhase('upsert');
  console.info('[country-signup] after_profile_upsert', {
    reqId,
    ok: !profileError,
    error: profileError?.message ?? null
  });

  if (profileError) {
    console.error('[country-signup] profiles upsert failed', {
      reqId,
      message: profileError.message
    });
    logResponseEnd(500, {
      reason: 'profile_upsert_failed',
      email: maskedEmail
    });
    return respond(
      { ok: false, error: profileError.message || 'Could not save profile.' },
      500
    );
  }

  if (createdNewUser) {
    void sendRegistrationVerificationEmail(email, userId, {
      displayName: nonEmptyString(profile.firstName) ?? null
    })
      .then((emailResult) => {
        if (!emailResult.ok) {
          console.warn(
            '[country-signup] verification email skipped',
            emailResult.skipped
          );
        }
      })
      .catch((error) => {
        console.warn('[country-signup] verification email failed', error);
      });
  }

  logResponseEnd(200, {
    email: maskedEmail,
    createdNewUser
  });
  return respond(
    {
      ok: true,
      userId,
      createdNewUser,
      emailSent: createdNewUser,
      requiresEmailVerification: createdNewUser
    },
    200
  );
}
