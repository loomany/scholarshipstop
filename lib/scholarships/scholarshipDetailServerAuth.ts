import { scholarshipNeedsEmailConfirmation } from '@/lib/scholarships/scholarshipEmailConfirmationGate';
import type { Database } from '@/types_db';
import { createClient } from '@/utils/supabase/server';
import { getUser, getUserSubscriptionStatus } from '@/utils/supabase/queries';

type ProfileEmailVerifiedRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'email_verified'
>;

export type ScholarshipDetailServerAuthSnapshot = {
  isAuthenticated: boolean;
  hasSubscription: boolean;
  needsEmailConfirmation: boolean;
};

/**
 * RSC snapshot for scholarship detail — aligns first paint with paid access
 * before the browser Supabase client finishes `getSession()`.
 */
export async function fetchScholarshipDetailServerAuthSnapshot(): Promise<ScholarshipDetailServerAuthSnapshot> {
  try {
    const supabase = createClient();
    const user = await getUser(supabase);
    if (!user?.id) {
      return {
        isAuthenticated: false,
        hasSubscription: false,
        needsEmailConfirmation: false
      };
    }
    const [{ data: profile }, hasSubscription] = await Promise.all([
      supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', user.id)
        .maybeSingle<ProfileEmailVerifiedRow>(),
      getUserSubscriptionStatus(supabase, user.id)
    ]);
    const needsEmailConfirmation = scholarshipNeedsEmailConfirmation(
      user,
      profile?.email_verified
    );
    return {
      isAuthenticated: true,
      hasSubscription,
      needsEmailConfirmation
    };
  } catch {
    return {
      isAuthenticated: false,
      hasSubscription: false,
      needsEmailConfirmation: false
    };
  }
}
