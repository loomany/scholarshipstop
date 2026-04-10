import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CONTENT_ARTICLE_MATCH_SECRET?.trim();
  const auth = request.headers.get('authorization')?.trim();
  return Boolean(secret && auth === `Bearer ${secret}`);
}

function fingerprintSecret(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return {
      present: false,
      length: 0,
      masked: null,
      fingerprint: null
    };
  }

  const head = normalized.slice(0, 2);
  const tail = normalized.slice(-2);
  return {
    present: true,
    length: normalized.length,
    masked: `${head}${'*'.repeat(Math.max(normalized.length - 4, 0))}${tail}`,
    fingerprint: crypto.createHash('sha256').update(normalized, 'utf8').digest('hex').slice(0, 12)
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const primary = process.env.LEMON_SQUEEZY_SECRET?.trim();
  const fallback = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  const selected = primary ?? fallback ?? '';

  return NextResponse.json({
    ok: true,
    requestUrl: request.url,
    nodeEnv: process.env.NODE_ENV ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    siteUrl: process.env.SITE_URL ?? null,
    nextPublicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    selectedWebhookSecretSource: primary ? 'LEMON_SQUEEZY_SECRET' : fallback ? 'LEMON_SQUEEZY_WEBHOOK_SECRET' : null,
    selectedWebhookSecret: fingerprintSecret(selected || undefined),
    lemonSqueezySecret: fingerprintSecret(primary),
    lemonSqueezyWebhookSecret: fingerprintSecret(fallback)
  });
}
