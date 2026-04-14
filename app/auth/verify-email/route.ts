import { NextResponse, type NextRequest } from 'next/server';

import { SCHOLARSHIPS_HUB_ALL_MATCHES_HREF } from '@/app/scholarships/scholarshipListUrl';
import { parseEmailVerificationToken } from '@/lib/auth/emailVerificationToken';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';
import {
  getServerAuthCallbackUrl,
  getServerAuthSiteOrigin
} from '@/utils/auth-email-redirect.server';
import { getStatusRedirect } from '@/utils/helpers';

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const origin = getServerAuthSiteOrigin().replace(/\/+$/, '');
  const fail = () =>
    NextResponse.redirect(
      getStatusRedirect(
        `${origin}/account`,
        'Link invalid',
        'This confirmation link has expired or was already used. Request a new one from your account.'
      )
    );

  if (!token) return fail();

  const parsed = parseEmailVerificationToken(token);
  if (!parsed) return fail();

  const admin = createServiceRoleSupabaseClient();
  if (!admin) return fail();

  const now = new Date().toISOString();
  const { error } = await admin
    .schema('public')
    .from('profiles')
    .update({ email_verified: true, updated_at: now })
    .eq('id', parsed.userId);

  if (error) {
    console.error('[auth:verify-email] profiles update', error.message);
    return fail();
  }

  /**
   * Resend links hit this route only — they never carry a Supabase PKCE `code`.
   * Without a follow-up hop through GoTrue, no session cookies are set (unlike `/auth/callback`).
   * Redirect to a server-generated magic link so the user lands on `/auth/callback?code=...` signed in.
   */
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(parsed.userId);
  const email = authUser?.user?.email?.trim();
  if (authErr || !email) {
    console.error('[auth:verify-email] getUserById', authErr?.message ?? 'missing email');
    return withNoStore(
      NextResponse.redirect(
        getStatusRedirect(
          `${origin}${SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}`,
          'Email confirmed',
          'Thanks — your email is verified.'
        )
      )
    );
  }

  const redirectTo = `${getServerAuthCallbackUrl()}?next=${encodeURIComponent(SCHOLARSHIPS_HUB_ALL_MATCHES_HREF)}`;
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo }
  });

  const actionLink = linkData?.properties?.action_link?.trim();
  if (linkErr || !actionLink) {
    console.error('[auth:verify-email] generateLink', linkErr?.message ?? 'no action_link');
    return withNoStore(
      NextResponse.redirect(
        getStatusRedirect(
          `${origin}${SCHOLARSHIPS_HUB_ALL_MATCHES_HREF}`,
          'Email confirmed',
          'Thanks — your email is verified.'
        )
      )
    );
  }

  return withNoStore(NextResponse.redirect(actionLink));
}
