'use client';

import { useEffect, useState } from 'react';

import { buildScholarshipProfileFilterSeed } from '@/lib/scholarships/profileFilterDefaults';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import type { CurrentUserScholarshipMatchProfile } from '@/lib/scholarships/profileMatchBadge';
import { createClient } from '@/utils/supabase/client';

type Result = {
  profile: CurrentUserScholarshipMatchProfile | null;
  profileInitialized: boolean;
  resolved: boolean;
};

const PROFILE_MATCH_FIELDS =
  'field_of_study, field_of_study_label, school_level, citizenship_status, state_region, country_code, city, gpa, saved_filters_snapshot, onboarding_completed';
const PROFILE_RETRY_ATTEMPTS = 6;
const PROFILE_RETRY_DELAY_MS = 700;

export function useCurrentUserScholarshipMatchProfile(
  enabled: boolean
): Result {
  const [profile, setProfile] =
    useState<CurrentUserScholarshipMatchProfile | null>(null);
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [resolved, setResolved] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setProfileInitialized(false);
      setResolved(true);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    setResolved(false);

    void (async () => {
      for (let attempt = 0; attempt <= PROFILE_RETRY_ATTEMPTS; attempt += 1) {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          if (!cancelled) {
            setProfile(null);
            setProfileInitialized(false);
            setResolved(true);
          }
          return;
        }

        const { data: row } = await supabase
          .from('profiles')
          .select(PROFILE_MATCH_FIELDS)
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        const next = (row ?? null) as CurrentUserScholarshipMatchProfile | null;
        const initialized = Boolean(
          (row as { onboarding_completed?: boolean } | null)?.onboarding_completed
        );
        const seedReady = Boolean(next && buildScholarshipProfileFilterSeed(next as ProfilesRow));
        setProfileInitialized(initialized);
        if (initialized && seedReady && next) {
          setProfile(next);
          setResolved(true);
          return;
        }

        setProfile(null);
        if (attempt >= PROFILE_RETRY_ATTEMPTS) {
          setResolved(true);
          return;
        }
        // After onboarding redirect, profile sync can lag behind auth by ~1-3s.
        console.info('[scholarships:profile] waiting for initialized profile', {
          attempt: attempt + 1,
          initialized,
          seedReady
        });
        await new Promise((resolve) => {
          window.setTimeout(resolve, PROFILE_RETRY_DELAY_MS);
        });
        if (cancelled) return;
      }
      if (!cancelled) {
        setResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { profile, profileInitialized, resolved };
}
