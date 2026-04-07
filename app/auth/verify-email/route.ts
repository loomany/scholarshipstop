import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { parseEmailVerificationToken } from '@/lib/auth/emailVerificationToken';
import type { Database } from '@/types_db';
import { getServerAuthSiteOrigin } from '@/utils/auth-email-redirect.server';
import { getStatusRedirect } from '@/utils/helpers';

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail();

  const admin = createClient<Database>(url, key);
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

  return NextResponse.redirect(
    getStatusRedirect(
      `${origin}/account`,
      'Email confirmed',
      'Thanks — your email is verified.'
    )
  );
}
