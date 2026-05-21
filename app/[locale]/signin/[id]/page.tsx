import { MagicLinkImplicitSession } from '@/components/auth/MagicLinkImplicitSession';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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
import { isStage2PilotLocale } from '@/lib/i18n/pilotRoutes';
import { getAuthUiCopy } from '@/lib/i18n/authUiCopy';
import { localizedPilotHref } from '@/lib/i18n/localizedHref';
import { SCHOLARSHIPS_HUB_BEST_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';

export default async function LocalizedSignInView({
  params,
  searchParams
}: {
  params: { id: string; locale: string };
  searchParams: { disable_button?: boolean };
}) {
  if (!isStage2PilotLocale(params.locale)) notFound();
  const locale = params.locale;
  const ui = getAuthUiCopy(locale);
  const { allowOauth, allowEmail, allowPassword } = getAuthTypes();
  const viewTypes = getViewTypes();
  const redirectMethod = getRedirectMethod();

  let viewProp: string;

  if (typeof params.id === 'string' && viewTypes.includes(params.id)) {
    viewProp = params.id;
  } else {
    const preferredSignInView =
      cookies().get('preferredSignInView')?.value || null;
    viewProp = getDefaultSignInView(preferredSignInView);
    return redirect(`/${locale}/signin/${viewProp}`);
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user && viewProp !== 'update_password') {
    return redirect(
      localizedPilotHref(locale, '/scholarships') ??
        SCHOLARSHIPS_HUB_BEST_MATCHES_HREF
    );
  }

  const cardDescription =
    viewProp === 'password_signin'
      ? ui.signInDescription
      : viewProp === 'forgot_password'
        ? ui.forgotPasswordDescription
        : viewProp === 'update_password'
          ? ui.updatePasswordDescription
          : undefined;

  const cardTitle =
    viewProp === 'forgot_password'
      ? ui.forgotPasswordCardTitle
      : viewProp === 'update_password'
        ? ui.updatePasswordCardTitle
        : viewProp === 'signup'
          ? ui.signUpCardTitle
          : ui.signInCardTitle;

  return (
    <div className="height-screen-helper flex min-h-[calc(100vh-5rem)] justify-center bg-zinc-50 px-4 py-8 sm:py-10">
      <MagicLinkImplicitSession />
      <div className="m-auto flex w-full max-w-[440px] flex-col items-stretch">
        <Card variant="auth" title={cardTitle} description={cardDescription}>
          {viewProp === 'password_signin' && (
            <PasswordSignIn redirectMethod={redirectMethod} locale={locale} />
          )}
          {viewProp === 'email_signin' && (
            <EmailSignIn
              allowPassword={allowPassword}
              redirectMethod={redirectMethod}
              disableButton={searchParams.disable_button}
              locale={locale}
            />
          )}
          {viewProp === 'forgot_password' && (
            <ForgotPassword
              redirectMethod={redirectMethod}
              disableButton={searchParams.disable_button}
              locale={locale}
            />
          )}
          {viewProp === 'update_password' && (
            <UpdatePasswordSessionGate redirectMethod={redirectMethod} />
          )}
          {viewProp === 'signup' && (
            <SignUp
              allowEmail={allowEmail}
              redirectMethod={redirectMethod}
              locale={locale}
            />
          )}
          {viewProp !== 'update_password' &&
            viewProp !== 'signup' &&
            viewProp !== 'password_signin' &&
            viewProp !== 'forgot_password' &&
            allowOauth && (
              <>
                <Separator text={ui.thirdPartySeparator} />
                <OauthSignIn />
              </>
            )}
        </Card>
      </div>
    </div>
  );
}
