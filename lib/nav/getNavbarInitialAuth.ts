import { cookies } from 'next/headers';

import {
  profileDisplayNameFromRow,
  profileFirstNameFromRow
} from '@/lib/nav/accountDisplayName';
import { hasSupabaseAuthCookie } from '@/utils/supabase/authCookie';
import { createClient } from '@/utils/supabase/server';

export type NavbarInitialAuth = {
  userId: string;
  email: string | null;
  profileDisplayName: string | null;
  profileFirstName: string | null;
} | null;

/** Session + profile names for the navbar so the client does not flash email before `profiles` loads. */
export async function getNavbarInitialAuth(): Promise<NavbarInitialAuth> {
  if (!hasSupabaseAuthCookie(cookies().getAll())) return null;

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name,last_name')
    .eq('id', user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profileDisplayName: profileDisplayNameFromRow(profile),
    profileFirstName: profileFirstNameFromRow(profile)
  };
}
