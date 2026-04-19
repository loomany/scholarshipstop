'use client';

import { useEffect, useState } from 'react';

import { buildScholarshipProfileFilterSeed } from '@/lib/scholarships/profileFilterDefaults';
import type { ProfilesRow } from '@/lib/scholarships/scholarshipMatch';
import type { CurrentUserScholarshipMatchProfile } from '@/lib/scholarships/profileMatchBadge';
import { createClient } from '@/utils/supabase/client';

type Result = {
  profile: CurrentUserScholarshipMatchProfile | null;
  resolved: boolean;
};

const PROFILE_MATCH_FIELDS =
  'field_of_study, field_of_study_label, school_level, citizenship_status, state_region, gpa, saved_filters_snapshot';

export function useCurrentUserScholarshipMatchProfile(
  enabled: boolean
): Result {
  const [profile, setProfile] =
    useState<CurrentUserScholarshipMatchProfile | null>(null);
  const [resolved, setResolved] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setResolved(true);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    setResolved(false);

    void (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) {
          setProfile(null);
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
      if (!next || !buildScholarshipProfileFilterSeed(next as ProfilesRow)) {
        setProfile(null);
        setResolved(true);
        return;
      }

      setProfile(next);
      setResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { profile, resolved };
}
