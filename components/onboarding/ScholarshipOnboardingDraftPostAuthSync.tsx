'use client';

/**
 * Fallback: sync onboarding from localStorage after OAuth if the server-side pending draft
 * (`/api/onboarding/pending-oauth-draft` + `/auth/callback`) did not run (e.g. old tab).
 * Email/password signup still uses JWT `scholarship_profile` + callback.
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

  useEffect(() => {
    if (!loadStoredOnboardingDraft()) return;

    const supabase = createClient();

    const trySync = async () => {
      if (inFlight.current) return;
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const draft = loadStoredOnboardingDraft();
      if (!draft) return;

      const built = buildCompleteScholarshipUserProfile(draft, {
        forGoogleOAuth: true
      });
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
          return;
        }

        const result = await syncOnboardingToProfiles(
          supabase,
          user.id,
          built.profile
        );
        if (result.ok) {
          clearScholarshipOnboardingDraft();
          router.refresh();
        }
      } finally {
        inFlight.current = false;
      }
    };

    void trySync();
    /** Session cookies can lag the first paint right after OAuth redirect. */
    const t1 = setTimeout(() => void trySync(), 200);
    const t2 = setTimeout(() => void trySync(), 800);
    const t3 = setTimeout(() => void trySync(), 2500);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        void trySync();
      }
    });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
