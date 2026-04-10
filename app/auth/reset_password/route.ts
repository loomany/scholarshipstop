import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';
import { getErrorRedirect, getStatusRedirect } from '@/utils/helpers';

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const publicOrigin = getServerAuthSiteOrigin().replace(/\/+$/, '');

  console.info('[auth:reset-password] incoming recovery request', {
    origin: requestUrl.origin,
    publicOrigin,
    path: requestUrl.pathname,
    hasCode: Boolean(code),
    hostHeader: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto')
  });

  if (code) {
    const supabase = createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return withNoStore(
        NextResponse.redirect(
          getErrorRedirect(
            `${publicOrigin}/signin/forgot_password`,
            error.name,
            "Sorry, we weren't able to log you in. Please try again."
          )
        )
      );
    }
  }

  // URL to redirect to after sign in process completes
  return withNoStore(
    NextResponse.redirect(
      getStatusRedirect(
        `${publicOrigin}/signin/update_password`,
        'You are now signed in.',
        'Please enter a new password for your account.'
      )
    )
  );
}
