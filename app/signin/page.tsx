import { redirect } from 'next/navigation';
import { getDefaultSignInView } from '@/utils/auth-helpers/settings';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: {
    index: false,
    follow: true
  }
};

export default async function SignIn() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) {
    return redirect('/scholarships');
  }

  const preferredSignInView =
    cookies().get('preferredSignInView')?.value || null;
  const defaultView = getDefaultSignInView(preferredSignInView);

  return redirect(`/signin/${defaultView}`);
}
