import { NextResponse } from 'next/server';

import { normalizeMarketingEmail } from '@/lib/email/normalizeMarketingEmail';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/serviceRoleClient';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readEmailFromUrl(req: Request): string | null {
  const url = new URL(req.url);
  return url.searchParams.get('email')?.trim() || null;
}

async function resolveEmailFromPost(req: Request): Promise<string | null> {
  const fromQuery = readEmailFromUrl(req);
  const ct = req.headers.get('content-type') || '';

  if (ct.includes('application/json')) {
    try {
      const j = (await req.json()) as { email?: string };
      const fromBody = j.email?.trim();
      return fromBody || fromQuery || null;
    } catch {
      return fromQuery || null;
    }
  }

  if (ct.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    if (text.includes('List-Unsubscribe=One-Click')) {
      return fromQuery || null;
    }
    const params = new URLSearchParams(text);
    return params.get('email')?.trim() || fromQuery || null;
  }

  return fromQuery || null;
}

export async function POST(req: Request) {
  const emailRaw = await resolveEmailFromPost(req);
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 503 }
    );
  }

  const email = normalizeMarketingEmail(emailRaw);
  const { error } = await admin.from('unsubscribed_emails').insert({ email });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true });
    }
    console.error('[api/unsubscribe]', error.message);
    return NextResponse.json({ error: 'Could not save preference' }, { status: 500 });
  }

  const ct = req.headers.get('accept') || '';
  if (ct.includes('text/html')) {
    return new NextResponse(
      '<!DOCTYPE html><html><body><p>Unsubscribed.</p></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  return NextResponse.json({ ok: true });
}
