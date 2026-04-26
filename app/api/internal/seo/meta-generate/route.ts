import { NextResponse } from 'next/server';

import { processAiMetaQueueBatch } from '@/lib/seo/aiMetaDescriptionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_BATCH = 20;

function isAuthorized(request: Request): boolean {
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let payload: { limit?: number } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    payload = {};
  }
  const limit =
    Number.isFinite(payload.limit) && (payload.limit ?? 0) > 0
      ? Math.min(100, Math.floor(payload.limit as number))
      : Math.max(
          1,
          Math.min(
            100,
            Math.floor(Number(process.env.SEO_AI_META_BATCH ?? `${DEFAULT_BATCH}`)) ||
              DEFAULT_BATCH
          )
        );

  try {
    const result = await processAiMetaQueueBatch(limit);
    return NextResponse.json({ ok: true, limit, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[seo/meta-generate]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
