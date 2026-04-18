import { NextResponse } from 'next/server';

import {
  enqueueGoogleIndexingUrls,
  essayIndexingUrl,
  providerIndexingUrl,
  resourceIndexingUrl,
  scholarshipIndexingUrl,
  type GoogleIndexingContentKind,
  type GoogleIndexingNotificationType
} from '@/lib/seo/googleIndexingQueue';

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

  const body = (await request.json().catch(() => null)) as
    | {
        kind?: GoogleIndexingContentKind;
        notificationType?: GoogleIndexingNotificationType;
        source?: string;
      url?: string;
        scholarship?: { id: string; slug?: string | null };
        resource?: { slug: string };
        provider?: { routeId: string };
        essay?: { slug: string };
      page?: { url: string };
      }
    | null;

  const kind = body?.kind;
  if (!kind) {
    return NextResponse.json({ error: 'Missing kind' }, { status: 400 });
  }

  const urls =
    kind === 'scholarship' && body?.scholarship?.id
      ? [scholarshipIndexingUrl(body.scholarship)]
      : kind === 'resource' && body?.resource?.slug?.trim()
        ? [resourceIndexingUrl(body.resource.slug.trim())]
        : kind === 'provider' && body?.provider?.routeId?.trim()
          ? [providerIndexingUrl(body.provider.routeId.trim())]
          : kind === 'essay' && body?.essay?.slug?.trim()
            ? [essayIndexingUrl(body.essay.slug.trim())]
            : kind === 'page' && body?.page?.url?.trim()
              ? [body.page.url.trim()]
              : typeof body?.url === 'string' && body.url.trim()
                ? [body.url.trim()]
            : [];

  if (urls.length === 0) {
    return NextResponse.json(
      { error: 'Missing entity payload for enqueue' },
      { status: 400 }
    );
  }

  return NextResponse.json(
    await enqueueGoogleIndexingUrls({
      kind,
      urls,
      notificationType: body?.notificationType,
      source: body?.source ?? `internal:${kind}:enqueue`
    })
  );
}
