/**
 * POST /api/revalidate — shared by SEO fix scripts (same env vars as legacy essay fix).
 */
export type PostSeoRevalidateParams = {
  path: string;
  /** When set, sent as `tag`. When omitted, essay paths still get explicit `essay-{slug}` to match legacy behavior. */
  tag?: string | null;
};

function normalizePath(input: string): string {
  let p = (input || '').trim();
  if (!p) return '/';
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p;
}

export async function postSeoRevalidate(params: PostSeoRevalidateParams): Promise<boolean> {
  const urlPath = normalizePath(params.path);
  const base =
    process.env.SEO_REVALIDATE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'http://localhost:3000';
  const endpoint = `${base.replace(/\/+$/, '')}/api/revalidate`;
  let tag = params.tag?.trim() || undefined;
  if (!tag && urlPath.startsWith('/essays/')) {
    const slug = urlPath.replace('/essays/', '').trim();
    if (slug) tag = `essay-${slug}`;
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: urlPath,
        tag,
        secret: process.env.REVALIDATE_API_SECRET?.trim() || undefined
      })
    });
    if (!res.ok) return false;
    const payload = (await res.json()) as { ok?: boolean };
    return Boolean(payload.ok);
  } catch {
    return false;
  }
}
