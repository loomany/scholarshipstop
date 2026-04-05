import { createClient } from '@/utils/supabase/client';
import { gpaForProfileDb } from '@/lib/constants/scholarshipGpaOptions';
import type { Database } from '@/types_db';
import type { UserProfile } from '@/lib/onboarding/userProfile';
import {
  pickAllowedProfilesUpsertFields,
  profilesRowOmitEmptyCitizenship,
  profilesRowOmitEmptyFieldOfStudy,
  profilesRowOmitEmptyLocation,
  syncOnboardingToProfiles
} from '@/lib/onboarding/profilesOnboardingSync';
import { triggerScholarshipMatchRefreshSignal } from '@/lib/scholarships/matchRefreshSignal';

export type { ProfilesOnboardingRow } from '@/lib/onboarding/profilesOnboardingSync';
export {
  profileToProfilesOnboardingRow,
  syncOnboardingFromMetadataIfPresent
} from '@/lib/onboarding/profilesOnboardingSync';

/** Signed-in partial profile update (e.g. account settings). */
function profileToProfilesRowPartial(profile: UserProfile) {
  return profilesRowOmitEmptyCitizenship(
    profilesRowOmitEmptyLocation(
      profilesRowOmitEmptyFieldOfStudy({
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
      })
    )
  );
}

/**
 * Persists questionnaire fields to `public.profiles` only (email/password stay in Supabase Auth).
 */
export async function persistScholarshipProfile(
  profile: UserProfile
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in' };

  const row = profileToProfilesRowPartial(profile);
  const payload = pickAllowedProfilesUpsertFields({
    id: user.id,
    ...row
  }) as Database['public']['Tables']['profiles']['Insert'];
  const { error: profileErr } = await supabase
    .schema('public')
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  triggerScholarshipMatchRefreshSignal();
  return { ok: true };
}

export { syncOnboardingToProfiles };
