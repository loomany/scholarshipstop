import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.PROVIDERS_REVALIDATE_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        slugs?: string[];
        slug?: string;
      }
    | null;

  const slugs = (Array.isArray(body?.slugs) ? body?.slugs : [])
    .concat(typeof body?.slug === 'string' ? [body.slug] : [])
    .map((value) => decodeURIComponent(value).trim())
    .filter(Boolean);

  if (slugs.length === 0) {
    return NextResponse.json(
      { error: 'Body must include slug or slugs' },
      { status: 400 }
    );
  }

  const uniqueSlugs = Array.from(new Set(slugs));

  revalidatePath('/providers');
  for (const slug of uniqueSlugs) {
    revalidatePath(`/providers/${encodeURIComponent(slug)}`);
  }

  return NextResponse.json({
    ok: true,
    revalidated: uniqueSlugs.length,
    slugs: uniqueSlugs
  });
}
