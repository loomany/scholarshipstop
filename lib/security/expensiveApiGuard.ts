import { createHash, randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { createClient as createServerSupabaseClient } from '@/utils/supabase/server';

type Bucket = { count: number; resetAt: number };

export type ExpensiveApiGuardConfig = {
  windowMs: number;
  perIp: number;
  perSession: number;
  perUser: number;
  dailyPerIp: number;
  dailyPerSession: number;
  dailyPerUser: number;
  perIdentityConcurrency: number;
  globalConcurrency: number;
};

type GuardInput = {
  scope: string;
  ip: string;
  sessionId: string;
  userId?: string | null;
  now?: number;
};

export class RequestBodyTooLargeError extends Error {}

export async function readJsonBodyWithLimit<T>(
  request: Request,
  maxBodyBytes: number
): Promise<T> {
  if (!request.body) throw new SyntaxError('Request body is empty');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBodyBytes) {
      await reader.cancel();
      throw new RequestBodyTooLargeError('Request body is too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export type ExpensiveApiDecision =
  | { allowed: true; release: () => void }
  | {
      allowed: false;
      reason: 'rate_limit' | 'daily_budget' | 'concurrency';
      retryAfterSeconds: number;
    };

function positiveInteger(value: string | undefined, fallback: number) {
  const raw = value?.trim() ?? '';
  if (!/^\d+$/.test(raw)) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getExpensiveApiGuardConfig(): ExpensiveApiGuardConfig {
  return {
    windowMs:
      positiveInteger(process.env.AI_RATE_LIMIT_WINDOW_SECONDS, 60) * 1000,
    perIp: positiveInteger(process.env.AI_RATE_LIMIT_PER_IP, 8),
    perSession: positiveInteger(process.env.AI_RATE_LIMIT_PER_SESSION, 6),
    perUser: positiveInteger(process.env.AI_RATE_LIMIT_PER_USER, 20),
    dailyPerIp: positiveInteger(process.env.AI_DAILY_LIMIT_PER_IP, 100),
    dailyPerSession: positiveInteger(
      process.env.AI_DAILY_LIMIT_PER_SESSION,
      50
    ),
    dailyPerUser: positiveInteger(process.env.AI_DAILY_LIMIT_PER_USER, 300),
    perIdentityConcurrency: positiveInteger(
      process.env.AI_CONCURRENCY_PER_IDENTITY,
      2
    ),
    globalConcurrency: positiveInteger(process.env.AI_GLOBAL_CONCURRENCY, 12)
  };
}

function secondsUntilUtcMidnight(now: number) {
  const current = new Date(now);
  const midnight = Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate() + 1
  );
  return Math.max(1, Math.ceil((midnight - now) / 1000));
}

export class ExpensiveApiLimiter {
  private readonly minuteBuckets = new Map<string, Bucket>();
  private readonly dailyBuckets = new Map<string, Bucket>();
  private readonly active = new Map<string, number>();
  private globalActive = 0;

  constructor(
    private readonly config: ExpensiveApiGuardConfig,
    private readonly pepper: string
  ) {}

  private key(scope: string, kind: string, value: string) {
    return createHash('sha256')
      .update(`${this.pepper}:${scope}:${kind}:${value}`)
      .digest('hex');
  }

  begin(input: GuardInput): ExpensiveApiDecision {
    const now = input.now ?? Date.now();
    const identities = [
      {
        kind: 'ip',
        value: input.ip,
        minuteLimit: this.config.perIp,
        dailyLimit: this.config.dailyPerIp
      },
      {
        kind: 'session',
        value: input.sessionId,
        minuteLimit: this.config.perSession,
        dailyLimit: this.config.dailyPerSession
      },
      ...(input.userId
        ? [
            {
              kind: 'user',
              value: input.userId,
              minuteLimit: this.config.perUser,
              dailyLimit: this.config.dailyPerUser
            }
          ]
        : [])
    ];
    const keyed = identities.map((identity) => ({
      ...identity,
      key: this.key(input.scope, identity.kind, identity.value)
    }));

    const minute = keyed.map((identity) => ({
      ...identity,
      bucket: this.currentBucket(
        this.minuteBuckets,
        identity.key,
        now,
        now + this.config.windowMs
      )
    }));
    const minuteBlocked = minute.find(
      ({ bucket, minuteLimit }) => bucket.count >= minuteLimit
    );
    if (minuteBlocked) {
      return {
        allowed: false,
        reason: 'rate_limit',
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((minuteBlocked.bucket.resetAt - now) / 1000)
        )
      };
    }

    const dailyResetAt = now + secondsUntilUtcMidnight(now) * 1000;
    const daily = keyed.map((identity) => ({
      ...identity,
      bucket: this.currentBucket(
        this.dailyBuckets,
        identity.key,
        now,
        dailyResetAt
      )
    }));
    const dailyBlocked = daily.find(
      ({ bucket, dailyLimit }) => bucket.count >= dailyLimit
    );
    if (dailyBlocked) {
      return {
        allowed: false,
        reason: 'daily_budget',
        retryAfterSeconds: secondsUntilUtcMidnight(now)
      };
    }

    const activeBlocked = keyed.some(
      ({ key }) =>
        (this.active.get(key) ?? 0) >= this.config.perIdentityConcurrency
    );
    if (activeBlocked || this.globalActive >= this.config.globalConcurrency) {
      return {
        allowed: false,
        reason: 'concurrency',
        retryAfterSeconds: 5
      };
    }

    minute.forEach(({ bucket }) => (bucket.count += 1));
    daily.forEach(({ bucket }) => (bucket.count += 1));
    keyed.forEach(({ key }) =>
      this.active.set(key, (this.active.get(key) ?? 0) + 1)
    );
    this.globalActive += 1;

    let released = false;
    return {
      allowed: true,
      release: () => {
        if (released) return;
        released = true;
        keyed.forEach(({ key }) => {
          const next = (this.active.get(key) ?? 1) - 1;
          if (next <= 0) this.active.delete(key);
          else this.active.set(key, next);
        });
        this.globalActive = Math.max(0, this.globalActive - 1);
      }
    };
  }

  private currentBucket(
    buckets: Map<string, Bucket>,
    key: string,
    now: number,
    resetAt: number
  ) {
    const current = buckets.get(key);
    if (current && current.resetAt > now) return current;
    const bucket = { count: 0, resetAt };
    buckets.set(key, bucket);
    return bucket;
  }
}

const globalGuard = globalThis as typeof globalThis & {
  scholarshipTopExpensiveApiLimiter?: ExpensiveApiLimiter;
};

function clientIp(headers: Headers) {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0] ??
    'unknown'
  )
    .trim()
    .slice(0, 128);
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get('cookie') ?? '';
  for (const item of cookie.split(';')) {
    const [rawName, ...rest] = item.trim().split('=');
    if (rawName === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function authenticatedUserId() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  ) {
    return null;
  }
  try {
    const { data } = await createServerSupabaseClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function attachSessionCookie(response: Response, sessionId: string) {
  response.headers.append(
    'Set-Cookie',
    `st_ai_session=${encodeURIComponent(sessionId)}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );
  return response;
}

export async function withExpensiveApiGuard(
  request: Request,
  options: { scope: string; maxBodyBytes: number },
  handler: () => Promise<Response>
) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > options.maxBodyBytes) {
    return NextResponse.json(
      { error: 'Request body is too large' },
      { status: 413 }
    );
  }

  const userId = await authenticatedUserId();
  if (
    !userId &&
    process.env.NODE_ENV === 'production' &&
    process.env.AI_GUEST_ACCESS_ENABLED !== '1'
  ) {
    return NextResponse.json(
      { error: 'Guest AI access is temporarily unavailable' },
      { status: 403 }
    );
  }

  const existingSessionId = cookieValue(request, 'st_ai_session');
  const sessionId = existingSessionId || randomUUID();
  const config = getExpensiveApiGuardConfig();
  const pepper =
    process.env.AI_RATE_LIMIT_SECRET?.trim() ||
    process.env.EMAIL_VERIFICATION_SECRET?.trim() ||
    'expensive-api-rate-limit';
  const limiter =
    globalGuard.scholarshipTopExpensiveApiLimiter ??
    new ExpensiveApiLimiter(config, pepper);
  globalGuard.scholarshipTopExpensiveApiLimiter = limiter;
  const decision = limiter.begin({
    scope: options.scope,
    ip: clientIp(request.headers),
    sessionId,
    userId
  });

  if (!decision.allowed) {
    console.warn('[ai-abuse-guard] request blocked', {
      scope: options.scope,
      reason: decision.reason,
      authenticated: Boolean(userId)
    });
    const response = NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(decision.retryAfterSeconds) }
      }
    );
    return existingSessionId
      ? response
      : attachSessionCookie(response, sessionId);
  }

  try {
    const response = await handler();
    return existingSessionId
      ? response
      : attachSessionCookie(response, sessionId);
  } finally {
    decision.release();
  }
}
