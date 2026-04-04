import { unstable_cache } from 'next/cache';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import {
  buildScholarshipMatchIndex,
  rehydrateBuiltMatchIndex,
  type BuiltMatchIndex
} from '@/lib/scholarships/scholarshipMatchIndex';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import { profileSupportsPersonalizedMatch } from '@/lib/scholarships/scholarshipMatch';

export function scholarshipMatchProfileVersion(p: ProfilesRow): string {
  return [
    p.field_of_study ?? '',
    p.field_of_study_label ?? '',
    p.school_level ?? '',
    p.school_level_label ?? '',
    p.citizenship_status ?? '',
    String(p.gpa ?? ''),
    p.birth_month ?? '',
    p.birth_day != null ? String(p.birth_day) : '',
    p.birth_year != null ? String(p.birth_year) : '',
    p.date_of_birth ?? '',
    p.state_region ?? ''
  ].join('|');
}

/**
 * Cached per user + profile fields that affect scoring. Revalidates every 5 minutes.
 *
 * `supabase` must be created **outside** this function (e.g. `createClient()` in the route /
 * RSC). Do not call `createClient()` / `cookies()` inside the `unstable_cache` callback —
 * Next.js forbids dynamic data sources inside cached scopes.
 */
export async function getCachedScholarshipMatchIndex(
  supabase: SupabaseClient<Database>,
  userId: string,
  profile: ProfilesRow
): Promise<BuiltMatchIndex> {
  const version = scholarshipMatchProfileVersion(profile);
  const cached = unstable_cache(
    async () => buildScholarshipMatchIndex(supabase, profile),
    ['scholarship-match-index', userId, version],
    { revalidate: 300 }
  );
  const raw = await cached();
  return rehydrateBuiltMatchIndex(raw as BuiltMatchIndex);
}

export function canBuildPersonalizedMatchIndex(
  profile: ProfilesRow | null
): profile is ProfilesRow {
  return profileSupportsPersonalizedMatch(profile);
}
