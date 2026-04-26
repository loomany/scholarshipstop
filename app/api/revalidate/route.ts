import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

type RevalidateBody = {
  path?: string;
  tag?: string;
  secret?: string;
};

function normalizePath(input: string): string {
  let p = (input || '').trim();
  if (!p) return '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RevalidateBody;
    const expectedSecret = process.env.REVALIDATE_API_SECRET?.trim();
    const providedSecret = body.secret?.trim();
    if (expectedSecret && providedSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const path = normalizePath(body.path || '/');
    revalidatePath(path);

    if (body.tag?.trim()) {
      revalidateTag(body.tag.trim());
    } else if (path.startsWith('/essays/')) {
      const slug = path.replace('/essays/', '').trim();
      if (slug) revalidateTag(`essay-${slug}`);
    }

    return NextResponse.json({ ok: true, path, tag: body.tag ?? null });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

