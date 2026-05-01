import { randomUUID } from 'crypto';

import { sendRegistrationVerificationEmail } from '@/lib/email/sendRegistrationVerificationEmail';
import { gpaForProfileDb } from '@/lib/constants/scholarshipGpaOptions';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';
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
};

type CountrySignupPayload = {
  email?: string;
  countryCode?: string;
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

async function findAuthUserIdByEmail(
  admin: NonNullable<ReturnType<typeof createServiceRoleSupabaseClient>>,
  email: string
): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    });
    if (error) {
      console.warn('[country-signup] listUsers failed', error.message);
      return null;
    }
    const users = data.users ?? [];
    const match = users.find((user) => user.email?.trim().toLowerCase() === target);
    if (match?.id) return match.id;
    if (users.length < 1000) return null;
  }
  return null;
}

function buildScholarshipProfileMetadata(
  profile: SignupProfileInput,
  countryCode: string
) {
  const gpa =
    typeof profile.gpa === 'number'
      ? profile.gpa
      : gpaForProfileDb(profile.gpa == null ? null : String(profile.gpa));
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
    citizenshipStatusLabel: nonEmptyString(profile.citizenshipStatusLabel) ?? null,
    countryCode,
    stateRegion: nonEmptyString(profile.stateRegion) ?? null,
    city: null,
    gpa,
    savedFiltersSnapshot: profile.savedFiltersSnapshot ?? null,
    onboardingCompleted: profile.onboardingCompleted === true,
    emailVerified: false
  };
}

function buildProfilesUpsert(
  userId: string,
  profile: SignupProfileInput,
  countryCode: string,
  createdNewUser: boolean
): Database['public']['Tables']['profiles']['Insert'] {
  const row: Database['public']['Tables']['profiles']['Insert'] = {
    id: userId,
    country_code: countryCode,
    email_weekly_free_digest: true,
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
  const birthMonth = profile.birthMonth != null ? String(profile.birthMonth).trim() : '';
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
  if (citizenshipStatusLabel) row.citizenship_status_label = citizenshipStatusLabel;
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

  return row;
}

function isMissingProfileCountryCode(error: { message?: string; code?: string } | null): boolean {
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
  const payload = (await request.json().catch(() => null)) as CountrySignupPayload | null;
  const email = payload?.email?.trim().toLowerCase() ?? '';
  const countryCode = normalizeCountryCode(payload?.countryCode);
  const source = payload?.source?.trim() || 'country-signup';
  const profile = payload?.profile ?? {};

  if (!isValidEmail(email)) {
    return Response.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!countryCode) {
    return Response.json({ ok: false, error: 'Choose a valid country.' }, { status: 400 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return Response.json(
      { ok: false, error: 'Server signup is not configured.' },
      { status: 500 }
    );
  }

  const metadata = buildScholarshipProfileMetadata(profile, countryCode);
  // Keep under GoTrue/bcrypt's 72-byte password ceiling; longer passwords can
  // surface as a vague Supabase "Internal Server Error".
  const generatedPassword = `${randomUUID()}A1!`;
  let createdNewUser = false;
  let userId = await findAuthUserIdByEmail(admin, email);
  let canUsePasswordForSession = false;

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        signup_source: source,
        scholarship_profile: JSON.stringify(metadata)
      }
    });

    if (created.user?.id) {
      createdNewUser = true;
      canUsePasswordForSession = true;
      userId = created.user.id;
    } else if (createError) {
      console.error('[country-signup] createUser failed', createError.message);
      return Response.json(
        {
          ok: false,
          error:
            createError.message === 'Internal Server Error'
              ? 'This email may already have an account. Please sign in with that email or try another email.'
              : createError.message || 'Could not create account.'
        },
        { status: createError.message === 'Internal Server Error' ? 409 : 400 }
      );
    }
  }

  if (!userId) {
    return Response.json({ ok: false, error: 'Could not create account.' }, { status: 500 });
  }

  if (!createdNewUser) {
    const {
      data: { user: sessionUser }
    } = await createServerSupabaseClient().auth.getUser();
    if (sessionUser?.id !== userId) {
      return Response.json(
        { ok: false, error: EXISTING_EMAIL_MESSAGE },
        { status: 409 }
      );
    }
  }

  const row = buildProfilesUpsert(userId, profile, countryCode, createdNewUser);
  const { error: profileError } = await upsertProfileWithSchemaFallback(admin, row);

  if (profileError) {
    console.error('[country-signup] profiles upsert failed', profileError.message);
    return Response.json(
      { ok: false, error: profileError.message || 'Could not save profile.' },
      { status: 500 }
    );
  }

  if (createdNewUser) {
    void sendRegistrationVerificationEmail(email, userId, {
      displayName: nonEmptyString(profile.firstName) ?? null
    }).then((emailResult) => {
      if (!emailResult.ok) {
        console.warn('[country-signup] verification email skipped', emailResult.skipped);
      }
    }).catch((error) => {
      console.warn('[country-signup] verification email failed', error);
    });
  }

  return Response.json({
    ok: true,
    userId,
    createdNewUser,
    emailSent: createdNewUser,
    sessionPassword: canUsePasswordForSession ? generatedPassword : null
  });
}
