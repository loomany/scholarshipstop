import { NextResponse } from 'next/server';

import { runSeoWorkerGenerate } from '@/scripts/seo-worker-generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: { limit?: number; compareOnly?: boolean; dryRun?: boolean } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    payload = {};
  }

  try {
    const result = await runSeoWorkerGenerate({
      limit: payload.limit,
      compareOnly: payload.compareOnly,
      dryRun: payload.dryRun
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[seo/worker-generate]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
