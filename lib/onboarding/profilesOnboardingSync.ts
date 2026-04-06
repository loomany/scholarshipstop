import { citizenshipLabelForValue } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { gpaForProfileDb } from '@/lib/constants/scholarshipGpaOptions';
import type { Database } from '@/types_db';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import type { createClient as createBrowserClient } from '@/utils/supabase/client';
import type { createClient as createServerClient } from '@/utils/supabase/server';

type AppSupabaseClient =
  | ReturnType<typeof createBrowserClient>
  | ReturnType<typeof createServerClient>;

/** Only these keys are sent to `public.profiles` upsert. */
export const PROFILES_UPSERT_ALLOWED_KEYS = new Set([
  'id',
  'first_name',
  'last_name',
  'birth_month',
  'birth_day',
  'birth_year',
  'date_of_birth',
  'school_level',
  'school_level_label',
  'field_of_study',
  'field_of_study_label',
  'citizenship_status',
  'citizenship_status_label',
  'gpa',
  'state_region',
  'onboarding_completed',
  'updated_at'
]);

export function pickAllowedProfilesUpsertFields(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!PROFILES_UPSERT_ALLOWED_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export type ProfilesOnboardingRow = {
  first_name: string | null;
  last_name: string | null;
  birth_month: string | null;
  birth_day: number | null;
  birth_year: number | null;
  date_of_birth: string | null;
  school_level: string | null;
  school_level_label: string | null;
  field_of_study: string | null;
  field_of_study_label: string | null;
  citizenship_status: string | null;
  citizenship_status_label: string | null;
  gpa: number | null;
  state_region: string | null;
  onboarding_completed: boolean;
  updated_at: string;
};

/** Avoid clearing `field_of_study` when a partial update has no major yet. */
export function profilesRowOmitEmptyFieldOfStudy(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...row };
  if (out.field_of_study == null || out.field_of_study === '') {
    delete out.field_of_study;
    delete out.field_of_study_label;
  }
  return out;
}

export function profilesRowOmitEmptyCitizenship(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...row };
  const s = out.citizenship_status;
  if (s == null || s === '') {
    delete out.citizenship_status;
    delete out.citizenship_status_label;
  }
  return out;
}

/** Skip location columns when all empty so onboarding signup does not touch `profiles` location fields. */
export function profilesRowOmitEmptyLocation(
  row: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...row };
  const c = out.country_code;
  const s = out.state_region;
  const city = out.city;
  if (
    (c == null || c === '') &&
    (s == null || s === '') &&
    (city == null || city === '')
  ) {
    delete out.country_code;
    delete out.state_region;
    delete out.city;
  }
  return out;
}

export function profileToProfilesOnboardingRow(profile: UserProfile): ProfilesOnboardingRow {
  return {
    first_name: profile.firstName?.trim() || null,
    last_name: profile.lastName?.trim() || null,
    birth_month:
      profile.birthMonth != null ? String(profile.birthMonth) : null,
    birth_day: profile.birthDay,
    birth_year: profile.birthYear,
    date_of_birth: profile.dateOfBirth,
    school_level: profile.schoolLevel,
    school_level_label: profile.schoolLevelLabel,
    field_of_study: profile.fieldOfStudy,
    field_of_study_label: profile.fieldOfStudyLabel,
    citizenship_status: profile.citizenshipStatus,
    citizenship_status_label: profile.citizenshipStatusLabel,
    gpa: gpaForProfileDb(profile.gpa),
    state_region: profile.stateRegion?.trim() || null,
    onboarding_completed: profile.onboardingCompleted,
    updated_at: new Date().toISOString()
  };
}

/** Form / `UserProfile` → DB payload (snake_case, allowlist only). */
export function buildScholarshipProfilesUpsertPayload(
  userId: string,
  profile: UserProfile
): Record<string, unknown> {
  const row = profilesRowOmitEmptyCitizenship(
    profilesRowOmitEmptyLocation(
      profilesRowOmitEmptyFieldOfStudy(
        profileToProfilesOnboardingRow(profile) as unknown as Record<string, unknown>
      )
    )
  );
  return pickAllowedProfilesUpsertFields({ id: userId, ...row });
}

function userProfileFromAuthMetadata(
  raw: Record<string, unknown>
): UserProfile {
  const p = raw as Partial<UserProfile>;
  const st =
    typeof p.citizenshipStatus === 'string'
      ? p.citizenshipStatus.trim() || null
      : null;
  return {
    firstName: p.firstName ?? null,
    lastName: p.lastName ?? null,
    birthMonth: p.birthMonth ?? null,
    birthDay: p.birthDay ?? null,
    birthYear: p.birthYear ?? null,
    dateOfBirth: p.dateOfBirth ?? null,
    schoolLevel: p.schoolLevel ?? null,
    schoolLevelLabel: p.schoolLevelLabel ?? null,
    fieldOfStudy: p.fieldOfStudy ?? null,
    fieldOfStudyLabel: p.fieldOfStudyLabel ?? null,
    citizenshipStatus: st,
    citizenshipStatusLabel:
      p.citizenshipStatusLabel ??
      (st ? citizenshipLabelForValue(st) : null),
    countryCode: p.countryCode ?? null,
    stateRegion: p.stateRegion ?? null,
    city: p.city ?? null,
    gpa: p.gpa ?? null,
    onboardingCompleted: Boolean(p.onboardingCompleted)
  };
}

export async function syncOnboardingToProfiles(
  supabase: AppSupabaseClient,
  userId: string,
  profile: UserProfile
): Promise<{ ok: boolean; error?: string }> {
  const payload = buildScholarshipProfilesUpsertPayload(
    userId,
    profile
  ) as Database['public']['Tables']['profiles']['Insert'];

  console.info('[onboarding:profile] final profile payload', payload);

  const { data: saved, error: profileErr } = await supabase
    .schema('public')
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (profileErr) {
    console.error(
      '[onboarding:profile] profiles upsert error',
      profileErr.message,
      profileErr
    );
    return { ok: false, error: profileErr.message };
  }
  console.info('[onboarding:profile] profiles upsert success', saved);
  return { ok: true };
}

/**
 * After email confirmation: copy `scholarship_profile` from user_metadata into public.profiles.
 */
export async function syncOnboardingFromMetadataIfPresent(
  supabase: AppSupabaseClient,
  userId: string,
  metadata: Record<string, unknown> | undefined
): Promise<void> {
  if (!metadata?.scholarship_profile || typeof metadata.scholarship_profile !== 'object') {
    return;
  }
  const profile = userProfileFromAuthMetadata(
    metadata.scholarship_profile as Record<string, unknown>
  );
  await syncOnboardingToProfiles(supabase, userId, profile);
}

export type ProfileCitizenshipLocationRow = {
  citizenship_status: string | null;
  citizenship_status_label: string | null;
  country_code: string | null;
  state_region: string | null;
  city: string | null;
};

export async function syncCitizenshipAndLocationToProfiles(
  supabase: AppSupabaseClient,
  userId: string,
  row: ProfileCitizenshipLocationRow
): Promise<{ ok: boolean; error?: string }> {
  const patch = pickAllowedProfilesUpsertFields(
    row as unknown as Record<string, unknown>
  );
  if (Object.keys(patch).length === 0) {
    return { ok: true };
  }
  const { error: profileErr } = await supabase
    .schema('public')
    .from('profiles')
    .update(patch)
    .eq('id', userId);

  if (profileErr) {
    console.error('[syncCitizenshipAndLocationToProfiles]', profileErr.message);
    return { ok: false, error: profileErr.message };
  }
  return { ok: true };
}
