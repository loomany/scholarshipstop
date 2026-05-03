import { citizenshipLabelForValue } from '@/lib/constants/onboardingCitizenshipAndLocation';
import { gpaForProfileDb } from '@/lib/constants/scholarshipGpaOptions';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types_db';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import type { createClient as createBrowserClient } from '@/utils/supabase/client';
import type { createClient as createServerClient } from '@/utils/supabase/server';

type AppSupabaseClient =
  | ReturnType<typeof createBrowserClient>
  | ReturnType<typeof createServerClient>
  | SupabaseClient<Database>;

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
  'country_code',
  'preferred_host_country_codes',
  'city',
  'gpa',
  'saved_filters_snapshot',
  'state_region',
  'onboarding_completed',
  'email_verified',
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
  country_code: string | null;
  preferred_host_country_codes?: Json;
  city: string | null;
  gpa: number | null;
  saved_filters_snapshot?: Record<string, unknown> | null;
  state_region: string | null;
  onboarding_completed: boolean;
  email_verified?: boolean;
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

/** Normalized jsonb ISO2 array; empty clears stored destinations when included in payload. */
function preferredHostCountryCodesJson(
  codes: string[] | null | undefined
): Json {
  if (!codes?.length) return [] as unknown as Json;
  const next = [
    ...new Set(
      codes
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c))
    )
  ];
  return next as unknown as Json;
}

export function profileToProfilesOnboardingRow(profile: UserProfile): ProfilesOnboardingRow {
  const row: ProfilesOnboardingRow = {
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
    country_code: profile.countryCode?.trim().toUpperCase() || null,
    city: profile.city?.trim() || null,
    gpa: gpaForProfileDb(profile.gpa),
    ...(Object.prototype.hasOwnProperty.call(profile, 'savedFiltersSnapshot')
      ? {
          saved_filters_snapshot: profile.savedFiltersSnapshot ?? null
        }
      : {}),
    state_region: profile.stateRegion?.trim() || null,
    onboarding_completed: profile.onboardingCompleted,
    ...(profile.emailVerified === false ? { email_verified: false } : {}),
    updated_at: new Date().toISOString()
  };
  if (
    Object.prototype.hasOwnProperty.call(profile, 'preferredHostCountryCodes') &&
    profile.preferredHostCountryCodes !== undefined &&
    profile.preferredHostCountryCodes !== null
  ) {
    row.preferred_host_country_codes = preferredHostCountryCodesJson(
      profile.preferredHostCountryCodes
    );
  }
  return row;
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
  const p = raw as Partial<UserProfile> & {
    preferred_host_country_codes?: unknown;
  };
  const st =
    typeof p.citizenshipStatus === 'string'
      ? p.citizenshipStatus.trim() || null
      : null;
  const prefRaw = Array.isArray(p.preferredHostCountryCodes)
    ? p.preferredHostCountryCodes
    : Array.isArray(p.preferred_host_country_codes)
      ? p.preferred_host_country_codes
      : null;
  const preferredHostCountryCodes = Array.isArray(prefRaw)
    ? [
        ...new Set(
          prefRaw
            .map((x) => String(x).trim().toUpperCase())
            .filter((c) => /^[A-Z]{2}$/.test(c))
        )
      ]
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
    ...(preferredHostCountryCodes && preferredHostCountryCodes.length > 0
      ? { preferredHostCountryCodes }
      : {}),
    countryCode: p.countryCode ?? null,
    stateRegion: p.stateRegion ?? null,
    city: p.city ?? null,
    gpa: p.gpa ?? null,
    ...(Object.prototype.hasOwnProperty.call(p, 'savedFiltersSnapshot')
      ? {
          savedFiltersSnapshot:
            (p.savedFiltersSnapshot as Record<string, unknown> | null) ?? null
        }
      : {}),
    // `scholarship_profile` payload means onboarding/profile init was completed.
    onboardingCompleted: p.onboardingCompleted === false ? false : true,
    ...(p.emailVerified === false ? { emailVerified: false } : {})
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

function scholarshipProfileRecordFromMetadata(
  raw: unknown
): Record<string, unknown> | null {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      console.warn(
        '[onboarding:profile] scholarship_profile in user_metadata is not valid JSON'
      );
    }
  }
  return null;
}

/**
 * After email confirmation: copy `scholarship_profile` from user_metadata into public.profiles.
 * Expects camelCase keys matching `UserProfile` — either a JSON object or a JSON string (signUp stores a string).
 */
export async function syncOnboardingFromMetadataIfPresent(
  supabase: AppSupabaseClient,
  userId: string,
  metadata: Record<string, unknown> | undefined
): Promise<void> {
  const parsed = scholarshipProfileRecordFromMetadata(metadata?.scholarship_profile);
  if (!parsed) {
    if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'scholarship_profile')) {
      console.info(
        '[onboarding:profile] scholarship_profile missing or unusable; user_metadata keys:',
        Object.keys(metadata)
      );
    }
    return;
  }

  console.info(
    '[onboarding:profile] scholarship_profile parsed; top-level keys:',
    Object.keys(parsed)
  );

  const profile = userProfileFromAuthMetadata(parsed);
  const result = await syncOnboardingToProfiles(supabase, userId, profile);
  if (!result.ok) {
    console.error('[onboarding:profile] sync from metadata failed', result.error);
  }
}

function strMeta(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Google / OIDC put display name in `full_name` or `name`, sometimes `given_name` / `family_name`.
 * Email-password signup uses `scholarship_profile` instead — this fills `profiles` when OAuth did not.
 */
export function firstLastFromOAuthUserMetadata(
  meta: Record<string, unknown>
): { first_name: string | null; last_name: string | null } {
  const given = strMeta(meta.given_name);
  const family = strMeta(meta.family_name);
  if (given || family) {
    return {
      first_name: given || null,
      last_name: family || null
    };
  }
  const full = strMeta(meta.full_name) || strMeta(meta.name);
  if (!full) {
    return { first_name: null, last_name: null };
  }
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: null, last_name: null };
  if (parts.length === 1) return { first_name: parts[0], last_name: null };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' ')
  };
}

/**
 * When `profiles.first_name` and `last_name` are still empty, copy from OAuth `user_metadata`
 * (e.g. Google `full_name`). Skips if either name is already set.
 */
export async function syncOAuthNamesToProfilesIfEmpty(
  supabase: AppSupabaseClient,
  userId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { first_name, last_name } = firstLastFromOAuthUserMetadata(metadata);
  if (!first_name && !last_name) return;

  const empty = (s: string | null | undefined) =>
    s == null || (typeof s === 'string' && s.trim() === '');

  const { data: row, error: selErr } = await supabase
    .schema('public')
    .from('profiles')
    .select('first_name,last_name')
    .eq('id', userId)
    .maybeSingle();

  if (selErr) {
    console.warn('[onboarding:oauth-names] select failed', selErr.message);
    return;
  }

  if (row && (!empty(row.first_name) || !empty(row.last_name))) {
    return;
  }

  const payload = pickAllowedProfilesUpsertFields({
    id: userId,
    first_name,
    last_name,
    updated_at: new Date().toISOString()
  }) as Database['public']['Tables']['profiles']['Insert'];

  const { error: upErr } = await supabase
    .schema('public')
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (upErr) {
    console.warn('[onboarding:oauth-names] upsert failed', upErr.message);
  }
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
