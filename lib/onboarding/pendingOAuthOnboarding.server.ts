import { createClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import { syncOnboardingToProfiles } from '@/lib/onboarding/profilesOnboardingSync';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import type { Database } from '@/types_db';

/** HttpOnly cookie linking the browser to a pending draft row after Google OAuth. */
export const OAUTH_PENDING_DRAFT_COOKIE = 'st_oauth_onb';

export const OAUTH_PENDING_TTL_MS = 15 * 60 * 1000;

function clearPendingDraftCookie(response: NextResponse) {
  response.cookies.set({
    name: OAUTH_PENDING_DRAFT_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  });
}

/**
 * After PKCE exchange: load server-stored draft (if cookie present), upsert full `profiles` row,
 * delete pending row, clear cookie. Fails closed on DB errors (draft left for client fallback).
 */
export async function consumePendingOnboardingDraftAfterOAuth(
  request: NextRequest,
  response: NextResponse,
  userId: string,
  accessToken: string
): Promise<void> {
  const token = request.cookies.get(OAUTH_PENDING_DRAFT_COOKIE)?.value?.trim();
  if (!token) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !serviceKey || !anonKey) {
    console.warn('[oauth-pending] missing env for consume');
    return;
  }

  const admin = createClient<Database>(url, serviceKey);

  const { data: row, error: fetchErr } = await admin
    .from('onboarding_oauth_pending')
    .select('draft, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (fetchErr || !row) {
    console.warn('[oauth-pending] no row or fetch error', fetchErr?.message);
    clearPendingDraftCookie(response);
    return;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from('onboarding_oauth_pending').delete().eq('token', token);
    clearPendingDraftCookie(response);
    return;
  }

  const draft = row.draft as unknown as StoredOnboardingDraft;
  const built = buildCompleteScholarshipUserProfile(draft);
  if (!built.ok) {
    console.warn('[oauth-pending] stored draft failed validation');
    await admin.from('onboarding_oauth_pending').delete().eq('token', token);
    clearPendingDraftCookie(response);
    return;
  }

  const syncClient = createClient<Database>(url, anonKey, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const result = await syncOnboardingToProfiles(syncClient, userId, built.profile);
  if (!result.ok) {
    console.error('[oauth-pending] profiles upsert failed', result.error);
    return;
  }

  await admin.from('onboarding_oauth_pending').delete().eq('token', token);
  clearPendingDraftCookie(response);
}
