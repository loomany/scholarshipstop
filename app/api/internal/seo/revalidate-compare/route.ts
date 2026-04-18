import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.COMPARE_REVALIDATE_SECRET?.trim() ||
    process.env.PROVIDERS_REVALIDATE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        paths?: string[];
        path?: string;
      }
    | null;

  const requestedPaths = (Array.isArray(body?.paths) ? body.paths : [])
    .concat(typeof body?.path === 'string' ? [body.path] : [])
    .map((value) => value.trim())
    .filter(Boolean);

  const paths = Array.from(
    new Set([
      '/compare',
      '/compare/universities',
      '/compare/states',
      '/sitemap.xml',
      '/sitemaps/compare.xml',
      ...requestedPaths
    ])
  );

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    ok: true,
    revalidated: paths.length,
    paths
  });
}
