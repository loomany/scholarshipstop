'use client';

/**
 * After OAuth (Google) signup, onboarding answers live only in localStorage — unlike email signUp,
 * which stores `scholarship_profile` in JWT metadata. When the user is signed in and the draft is
 * complete, upsert into `public.profiles` once (same as email flow) and clear the draft.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import {
  clearScholarshipOnboardingDraft,
  loadStoredOnboardingDraft
} from '@/lib/onboarding/scholarshipOnboardingDraft';
import { syncOnboardingToProfiles } from '@/lib/onboarding/syncScholarshipProfile';
import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/client';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

export function ScholarshipOnboardingDraftPostAuthSync() {
  const router = useRouter();
  const inFlight = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const trySync = async () => {
      if (done.current || inFlight.current) return;
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const draft = loadStoredOnboardingDraft();
      if (!draft) return;

      const built = buildCompleteScholarshipUserProfile(draft);
      if (!built.ok) return;

      inFlight.current = true;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        const p = profile as Pick<ProfilesRow, 'onboarding_completed'> | null;
        if (p?.onboarding_completed === true) {
          clearScholarshipOnboardingDraft();
          done.current = true;
          return;
        }

        const result = await syncOnboardingToProfiles(
          supabase,
          user.id,
          built.profile
        );
        if (result.ok) {
          clearScholarshipOnboardingDraft();
          done.current = true;
          router.refresh();
        }
      } finally {
        inFlight.current = false;
      }
    };

    void trySync();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void trySync();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return null;
}
