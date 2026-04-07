import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  return (
    process.env.EMAIL_VERIFICATION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''
  );
}

/** 7 days */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Opaque token for /auth/verify-email — no DB storage.
 * Uses HMAC; keep EMAIL_VERIFICATION_SECRET set in production.
 */
export function createEmailVerificationToken(userId: string): string {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = `${userId}.${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`, 'utf8').toString('base64url');
}

export function parseEmailVerificationToken(
  token: string
): { userId: string } | null {
  if (!token || !secret()) return null;
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const lastDot = raw.lastIndexOf('.');
    if (lastDot <= 0) return null;
    const sig = raw.slice(lastDot + 1);
    const payload = raw.slice(0, lastDot);
    const expected = createHmac('sha256', secret()).update(payload).digest('hex');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const dot = payload.indexOf('.');
    if (dot <= 0) return null;
    const userId = payload.slice(0, dot);
    const exp = Number(payload.slice(dot + 1));
    if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
    return { userId };
  } catch {
    return null;
  }
}
