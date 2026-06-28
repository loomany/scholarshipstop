import { createHash } from 'crypto';

type Bucket = {
  count: number;
  resetAt: number;
};

export type CountrySignupRateLimitConfig = {
  windowMs: number;
  perIp: number;
  perEmail: number;
  perSession: number;
};

export type CountrySignupRateLimitInput = {
  ip: string;
  email: string;
  sessionId: string;
  now?: number;
};

export type CountrySignupRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  emailHash: string;
};

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCountrySignupRateLimitConfig(): CountrySignupRateLimitConfig {
  return {
    windowMs:
      positiveInteger(
        process.env.COUNTRY_SIGNUP_RATE_LIMIT_WINDOW_SECONDS,
        900
      ) * 1000,
    perIp: positiveInteger(process.env.COUNTRY_SIGNUP_RATE_LIMIT_PER_IP, 10),
    perEmail: positiveInteger(
      process.env.COUNTRY_SIGNUP_RATE_LIMIT_PER_EMAIL,
      5
    ),
    perSession: positiveInteger(
      process.env.COUNTRY_SIGNUP_RATE_LIMIT_PER_SESSION,
      5
    )
  };
}

export function getCountrySignupClientIp(headers: Headers): string {
  const value =
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0] ??
    'unknown';
  return value.trim().slice(0, 128) || 'unknown';
}

export class CountrySignupRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly config: CountrySignupRateLimitConfig,
    private readonly pepper: string
  ) {}

  private hash(kind: string, value: string): string {
    return createHash('sha256')
      .update(`${this.pepper}:${kind}:${value.trim().toLowerCase()}`, 'utf8')
      .digest('hex');
  }

  consume(input: CountrySignupRateLimitInput): CountrySignupRateLimitResult {
    const now = input.now ?? Date.now();
    const identities = [
      { key: this.hash('ip', input.ip), limit: this.config.perIp },
      { key: this.hash('email', input.email), limit: this.config.perEmail },
      {
        key: this.hash('session', input.sessionId),
        limit: this.config.perSession
      }
    ];

    const active = identities.map(({ key, limit }) => {
      const current = this.buckets.get(key);
      const bucket =
        !current || current.resetAt <= now
          ? { count: 0, resetAt: now + this.config.windowMs }
          : current;
      return { key, limit, bucket };
    });

    const blocked = active.find(({ limit, bucket }) => bucket.count >= limit);
    if (blocked) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((blocked.bucket.resetAt - now) / 1000)
        ),
        emailHash: this.hash('email', input.email).slice(0, 12)
      };
    }

    for (const { key, bucket } of active) {
      bucket.count += 1;
      this.buckets.set(key, bucket);
    }

    if (this.buckets.size > 10_000) {
      for (const [key, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(key);
      }
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      emailHash: this.hash('email', input.email).slice(0, 12)
    };
  }
}

const globalRateLimit = globalThis as typeof globalThis & {
  scholarshipTopCountrySignupRateLimiter?: CountrySignupRateLimiter;
};

export function consumeCountrySignupRateLimit(
  input: CountrySignupRateLimitInput
): CountrySignupRateLimitResult {
  const config = getCountrySignupRateLimitConfig();
  const pepper =
    process.env.COUNTRY_SIGNUP_RATE_LIMIT_SECRET?.trim() ||
    process.env.EMAIL_VERIFICATION_SECRET?.trim() ||
    'country-signup-rate-limit';
  const limiter =
    globalRateLimit.scholarshipTopCountrySignupRateLimiter ??
    new CountrySignupRateLimiter(config, pepper);
  globalRateLimit.scholarshipTopCountrySignupRateLimiter = limiter;
  return limiter.consume(input);
}
