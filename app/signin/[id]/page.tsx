import { MagicLinkImplicitSession } from '@/components/auth/MagicLinkImplicitSession';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getAuthTypes,
  getViewTypes,
  getDefaultSignInView,
  getRedirectMethod
} from '@/utils/auth-helpers/settings';
import Card from '@/components/ui/Card';
import PasswordSignIn from '@/components/ui/AuthForms/PasswordSignIn';
import EmailSignIn from '@/components/ui/AuthForms/EmailSignIn';
import Separator from '@/components/ui/AuthForms/Separator';
import OauthSignIn from '@/components/ui/AuthForms/OauthSignIn';
import ForgotPassword from '@/components/ui/AuthForms/ForgotPassword';
import UpdatePasswordSessionGate from '@/components/ui/AuthForms/UpdatePasswordSessionGate';
import SignUp from '@/components/ui/AuthForms/Signup';

export default async function SignIn({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { disable_button: boolean };
}) {
  const { allowOauth, allowEmail, allowPassword } = getAuthTypes();
  const viewTypes = getViewTypes();
  const redirectMethod = getRedirectMethod();

  // Declare 'viewProp' and initialize with the default value
  let viewProp: string;

  // Assign url id to 'viewProp' if it's a valid string and ViewTypes includes it
  if (typeof params.id === 'string' && viewTypes.includes(params.id)) {
    viewProp = params.id;
  } else {
    const preferredSignInView =
      cookies().get('preferredSignInView')?.value || null;
    viewProp = getDefaultSignInView(preferredSignInView);
    return redirect(`/signin/${viewProp}`);
  }

  // Check if the user is already logged in and redirect to the account page if so
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && viewProp !== 'update_password') {
    return redirect('/');
  }
  /** `update_password`: recovery session is often visible only to the browser client — see
   * `UpdatePasswordSessionGate` (do not redirect unauthenticated users here). */

  const cardDescription =
    viewProp === 'password_signin'
      ? 'View your scholarship matches, saved opportunities, and application progress.'
      : viewProp === 'forgot_password'
        ? "Enter your email and we'll send you a password reset link."
        : viewProp === 'update_password'
          ? 'Create a new password for your ScholarshipTop account.'
        : undefined;

  return (
    <div className="height-screen-helper flex min-h-[calc(100vh-5rem)] justify-center bg-zinc-50 px-4 py-8 sm:py-10">
      <MagicLinkImplicitSession />
      <div className="m-auto flex w-full max-w-[440px] flex-col items-stretch">
        <Card
          variant="auth"
          title={
            viewProp === 'forgot_password'
              ? 'Reset Password'
              : viewProp === 'update_password'
                ? 'Set New Password'
                : viewProp === 'signup'
                  ? 'Sign Up'
                  : 'Sign in'
          }
          description={cardDescription}
        >
          {viewProp === 'password_signin' && (
            <PasswordSignIn redirectMethod={redirectMethod} />
          )}
          {viewProp === 'email_signin' && (
            <EmailSignIn
              allowPassword={allowPassword}
              redirectMethod={redirectMethod}
              disableButton={searchParams.disable_button}
            />
          )}
          {viewProp === 'forgot_password' && (
            <ForgotPassword
              redirectMethod={redirectMethod}
              disableButton={searchParams.disable_button}
            />
          )}
          {viewProp === 'update_password' && (
            <UpdatePasswordSessionGate redirectMethod={redirectMethod} />
          )}
          {viewProp === 'signup' && (
            <SignUp allowEmail={allowEmail} redirectMethod={redirectMethod} />
          )}
          {viewProp !== 'update_password' &&
            viewProp !== 'signup' &&
            viewProp !== 'password_signin' &&
            viewProp !== 'forgot_password' &&
            allowOauth && (
              <>
                <Separator text="Third-party sign-in" />
                <OauthSignIn />
              </>
            )}
        </Card>
      </div>
    </div>
  );
}
