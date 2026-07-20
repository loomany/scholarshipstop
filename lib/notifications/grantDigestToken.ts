import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

const DIGEST_TOKEN_VERSION = 1;
const DEFAULT_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_DIGEST_TOKEN_IDS = 24;

type DigestTokenPayload = {
  v: number;
  exp: number;
  ids: string[];
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signingSecret(): string | null {
  const direct = process.env.GRANT_DIGEST_TOKEN_SECRET?.trim();
  if (direct) return direct;
  // Prefer stable secret; SMTP_PASS / legacy RESEND_API_KEY only as last-resort fallbacks.
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpPass) return smtpPass;
  const legacyResend = process.env.RESEND_API_KEY?.trim();
  if (legacyResend) return legacyResend;
  return null;
}

function sign(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createGrantDigestToken(
  scholarshipIds: string[],
  nowMs = Date.now(),
  ttlMs = DEFAULT_TOKEN_TTL_MS
): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const ids = Array.from(new Set(scholarshipIds.filter(Boolean))).slice(0, MAX_DIGEST_TOKEN_IDS);
  if (ids.length === 0) return null;
  const payload: DigestTokenPayload = {
    v: DIGEST_TOKEN_VERSION,
    exp: nowMs + ttlMs,
    ids
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

export function readGrantDigestToken(token: string): {
  ok: boolean;
  scholarshipIds: string[];
  reason?: string;
} {
  const secret = signingSecret();
  if (!secret) return { ok: false, scholarshipIds: [], reason: 'missing-secret' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, scholarshipIds: [], reason: 'bad-format' };
  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64, secret);
  const left = Buffer.from(sig, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, scholarshipIds: [], reason: 'bad-signature' };
  }
  let parsed: DigestTokenPayload | null = null;
  try {
    parsed = JSON.parse(base64UrlDecode(payloadB64)) as DigestTokenPayload;
  } catch {
    return { ok: false, scholarshipIds: [], reason: 'bad-payload' };
  }
  if (!parsed || parsed.v !== DIGEST_TOKEN_VERSION) {
    return { ok: false, scholarshipIds: [], reason: 'bad-version' };
  }
  if (!Array.isArray(parsed.ids) || parsed.ids.length === 0) {
    return { ok: false, scholarshipIds: [], reason: 'empty-ids' };
  }
  if (Date.now() > parsed.exp) {
    return { ok: false, scholarshipIds: [], reason: 'expired' };
  }
  return { ok: true, scholarshipIds: parsed.ids };
}
