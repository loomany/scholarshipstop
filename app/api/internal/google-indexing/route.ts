import { NextResponse } from 'next/server';

import {
  enqueueGoogleIndexingUrls,
  flushGoogleIndexingQueue,
  getGoogleIndexingQueueSummary,
  type GoogleIndexingContentKind,
  type GoogleIndexingNotificationType
} from '@/lib/seo/googleIndexingQueue';

export const dynamic = 'force-dynamic';

type GoogleIndexingPostBody = {
  action?: string;
  kind?: GoogleIndexingContentKind;
  notificationType?: GoogleIndexingNotificationType;
  urls?: string[];
  url?: string;
  source?: string;
  limit?: number;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getGoogleIndexingQueueSummary());
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: GoogleIndexingPostBody | null = null;

  try {
    const text = await request.text();
    if (text?.trim()) {
      body = JSON.parse(text) as GoogleIndexingPostBody;
    }
  } catch (e) {
    console.error('[google-indexing] invalid JSON body', e);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const actionRaw =
    typeof body?.action === 'string' ? body.action.trim().toLowerCase() : '';
  const looksLikeCronFlushOnly = Boolean(
    body &&
      typeof body.limit === 'number' &&
      body.kind == null &&
      body.url == null &&
      body.urls == null &&
      (body.action == null || body.action === '')
  );
  const action: 'enqueue' | 'flush' =
    actionRaw === 'flush'
      ? 'flush'
      : actionRaw === 'enqueue'
        ? 'enqueue'
        : looksLikeCronFlushOnly
          ? 'flush'
          : 'enqueue';

  if (action === 'flush') {
    const limit =
      typeof body?.limit === 'number' && Number.isFinite(body.limit)
        ? body.limit
        : 50;
    const result = await flushGoogleIndexingQueue(limit);
    return NextResponse.json(result);
  }

  const kind = body?.kind;
  if (!kind) {
    return NextResponse.json(
      { error: 'Body must include kind for enqueue' },
      { status: 400 }
    );
  }

  const urls = (Array.isArray(body?.urls) ? body?.urls : [])
    .concat(typeof body?.url === 'string' ? [body.url] : [])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  if (urls.length === 0) {
    return NextResponse.json(
      { error: 'Body must include url or urls for enqueue' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    await enqueueGoogleIndexingUrls({
      urls,
      kind,
      notificationType: body?.notificationType,
      source: body?.source
    })
  );
}
