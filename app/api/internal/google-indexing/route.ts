import { NextResponse } from 'next/server';

import {
  enqueueGoogleIndexingUrls,
  flushGoogleIndexingQueue,
  getGoogleIndexingQueueSummary,
  type GoogleIndexingContentKind,
  type GoogleIndexingNotificationType
} from '@/lib/seo/googleIndexingQueue';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(getGoogleIndexingQueueSummary());
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: 'enqueue' | 'flush';
        kind?: GoogleIndexingContentKind;
        notificationType?: GoogleIndexingNotificationType;
        urls?: string[];
        url?: string;
        source?: string;
        limit?: number;
      }
    | null;

  const action = body?.action ?? 'enqueue';

  if (action === 'flush') {
    const result = await flushGoogleIndexingQueue(body?.limit ?? 50);
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
    enqueueGoogleIndexingUrls({
      urls,
      kind,
      notificationType: body?.notificationType,
      source: body?.source
    })
  );
}
