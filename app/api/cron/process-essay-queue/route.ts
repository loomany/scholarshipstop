import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types_db';
import { processOneEssayQueueItem } from '@/lib/essays/runEssayGenerationJob';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.ESSAY_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return false;
  const auth = request.headers.get('authorization')?.trim();
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('cron_secret') === secret;
}

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

/**
 * Processes at most ONE `essay_generation_queue` row (sequential worker).
 * If no `pending` rows exist, may promote one cooled-down `failed` row to `pending` and process it.
 * Vercel Cron: GET or POST with `Authorization: Bearer ${CRON_SECRET}` or `?cron_secret=`.
 */
async function handle() {
  const supabase = serviceSupabase();
  const result = await processOneEssayQueueItem(supabase);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return await handle();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return await handle();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
