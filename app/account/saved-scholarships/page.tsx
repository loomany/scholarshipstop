import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';

import { SCHOLARSHIPS_HUB_SAVED_TAB_HREF } from '@/app/scholarships/scholarshipListUrl';

/**
 * Legacy URL: saved list lives on the scholarships hub (My scholarships → Saved).
 */
export default async function SavedScholarshipsAccountRedirect() {
  const supabase = createClient();
  const user = await getUser(supabase);
  if (!user) {
    redirect('/signin');
  }
  redirect(SCHOLARSHIPS_HUB_SAVED_TAB_HREF);
}
