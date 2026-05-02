import { NextResponse } from 'next/server';

import { normalizeIndexNowUrls, submitToIndexNow } from '@/lib/seo/indexNow';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.INDEXNOW_SECRET?.trim() ||
    process.env.GOOGLE_INDEXING_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        urls?: unknown;
      }
    | null;

  if (!Array.isArray(body?.urls)) {
    return NextResponse.json(
      { error: 'Body must include urls as an array' },
      { status: 400 }
    );
  }

  const rawUrls = body.urls.filter(
    (url): url is string => typeof url === 'string'
  );

  const urls = normalizeIndexNowUrls(rawUrls);
  if (urls.length === 0) {
    return NextResponse.json(
      {
        error:
          'Body must include at least one valid https://scholarshiptop.com URL'
      },
      { status: 400 }
    );
  }

  try {
    const result = await submitToIndexNow(urls);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[indexnow] submit failed', { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
