import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { buildCompleteScholarshipUserProfile } from '@/lib/onboarding/buildScholarshipUserProfile';
import {
  OAUTH_PENDING_DRAFT_COOKIE,
  OAUTH_PENDING_TTL_MS
} from '@/lib/onboarding/pendingOAuthOnboarding.server';
import type { StoredOnboardingDraft } from '@/lib/onboarding/scholarshipOnboardingDraft';
import type { Database, Json } from '@/types_db';

/**
 * Store a validated full onboarding draft before redirecting to Google OAuth.
 * Sets HttpOnly cookie so /auth/callback can upsert profiles without relying on localStorage.
 */
export async function POST(request: Request) {
  const requestId = `pending-oauth-${Date.now().toString(36)}`;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.warn('[pending-oauth-draft] missing env', { requestId });
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn('[pending-oauth-draft] invalid json', { requestId });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draft = (body as { draft?: unknown })?.draft as StoredOnboardingDraft | undefined;
  if (!draft || typeof draft !== 'object') {
    console.warn('[pending-oauth-draft] missing draft payload', { requestId });
    return NextResponse.json({ error: 'Missing draft' }, { status: 400 });
  }

  const built = buildCompleteScholarshipUserProfile(draft, { forGoogleOAuth: true });
  if (!built.ok) {
    console.warn('[pending-oauth-draft] incomplete onboarding draft', { requestId });
    return NextResponse.json(
      { error: 'Onboarding is incomplete — finish all steps before Google sign-in.' },
      { status: 422 }
    );
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + OAUTH_PENDING_TTL_MS).toISOString();

  const admin = createClient<Database>(url, serviceKey);
  const { error: cleanupErr } = await admin
    .from('onboarding_oauth_pending')
    .delete()
    .lt('expires_at', new Date().toISOString());
  if (cleanupErr) {
    console.warn('[pending-oauth-draft] cleanup failed', {
      requestId,
      error: cleanupErr.message
    });
  }

  const { error: insErr } = await admin.from('onboarding_oauth_pending').insert({
    token,
    draft: draft as unknown as Json,
    expires_at: expiresAt
  });

  if (insErr) {
    console.error('[pending-oauth-draft] insert failed', {
      requestId,
      error: insErr.message
    });
    return NextResponse.json({ error: 'Could not save draft' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: OAUTH_PENDING_DRAFT_COOKIE,
    value: token,
    path: '/',
    maxAge: Math.floor(OAUTH_PENDING_TTL_MS / 1000),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  });
  console.info('[pending-oauth-draft] stored draft', { requestId });
  return res;
}
