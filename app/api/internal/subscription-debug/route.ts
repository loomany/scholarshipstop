import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { createClient as createServerClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const DEBUG_KEYS = [
  'subscription_debug_plan',
  'subscription_debug_status',
  'subscription_debug_trial_ends_at',
  'subscription_debug_renews_at',
  'subscription_debug_now'
] as const satisfies readonly (keyof ProfileUpdate)[];

function sanitizePatch(body: unknown): ProfileUpdate {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }
  const src = body as Record<string, unknown>;
  const patch: ProfileUpdate = {};
  for (const key of DEBUG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(src, key)) {
      (patch as Record<string, unknown>)[key] = src[key];
    }
  }
  return patch;
}

/**
 * Applies `subscription_debug_*` updates with the service role so the row passes
 * `prevent_profile_billing_self_updates` (client updates to billing fields are blocked).
 * Only available in development.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development.' }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Server is missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  const supabaseAuth = createServerClient();
  const {
    data: { user },
    error: authError
  } = await supabaseAuth.auth.getUser();

  if (authError || !user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const patch = sanitizePatch(raw);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields in body.' }, { status: 400 });
  }

  const admin = createClient<Database>(url, serviceKey);
  const { error } = await admin.from('profiles').update(patch).eq('id', user.id);

  if (error) {
    console.error('[subscription-debug] update failed', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
