import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CountrySignupRateLimiter,
  getCountrySignupClientIp
} from '@/lib/security/countrySignupRateLimit';

const config = {
  windowMs: 60_000,
  perIp: 3,
  perEmail: 2,
  perSession: 3
};

test('blocks the same email after its configured threshold', () => {
  const limiter = new CountrySignupRateLimiter(config, 'test-pepper');
  const input = {
    ip: '203.0.113.10',
    email: 'student@example.com',
    sessionId: 'session-a',
    now: 1_000
  };

  assert.equal(limiter.consume(input).allowed, true);
  assert.equal(
    limiter.consume({ ...input, sessionId: 'session-b' }).allowed,
    true
  );
  const blocked = limiter.consume({ ...input, sessionId: 'session-c' });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  assert.match(blocked.emailHash, /^[a-f0-9]{12}$/);
});

test('resets counters after the window expires', () => {
  const limiter = new CountrySignupRateLimiter(config, 'test-pepper');
  const input = {
    ip: '203.0.113.11',
    email: 'other@example.com',
    sessionId: 'session-a'
  };

  limiter.consume({ ...input, now: 1_000 });
  limiter.consume({ ...input, now: 1_001 });
  assert.equal(limiter.consume({ ...input, now: 1_002 }).allowed, false);
  assert.equal(limiter.consume({ ...input, now: 61_001 }).allowed, true);
});

test('prefers the Cloudflare client address over proxy fallbacks', () => {
  const headers = new Headers({
    'cf-connecting-ip': '198.51.100.7',
    'x-real-ip': '10.0.0.2',
    'x-forwarded-for': '10.0.0.3, 10.0.0.4'
  });
  assert.equal(getCountrySignupClientIp(headers), '198.51.100.7');
});
