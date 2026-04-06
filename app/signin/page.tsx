import { redirect } from 'next/navigation';
import { getDefaultSignInView } from '@/utils/auth-helpers/settings';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: {
    index: false,
    follow: true
  }
};

export default function SignIn() {
  const preferredSignInView =
    cookies().get('preferredSignInView')?.value || null;
  const defaultView = getDefaultSignInView(preferredSignInView);

  return redirect(`/signin/${defaultView}`);
}
