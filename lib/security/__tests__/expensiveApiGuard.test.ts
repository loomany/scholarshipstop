import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExpensiveApiLimiter,
  type ExpensiveApiGuardConfig
} from '@/lib/security/expensiveApiGuard';

const config: ExpensiveApiGuardConfig = {
  windowMs: 60_000,
  perIp: 2,
  perSession: 2,
  perUser: 3,
  dailyPerIp: 3,
  dailyPerSession: 3,
  dailyPerUser: 4,
  perIdentityConcurrency: 1,
  globalConcurrency: 2
};

function input(now = Date.UTC(2026, 5, 28, 12)) {
  return {
    scope: 'guest',
    ip: '203.0.113.10',
    sessionId: 'session-1',
    userId: null,
    now
  };
}

test('blocks concurrent work for the same identity and releases exactly once', () => {
  const limiter = new ExpensiveApiLimiter(config, 'test-pepper');
  const first = limiter.begin(input());
  assert.equal(first.allowed, true);
  assert.deepEqual(limiter.begin(input()), {
    allowed: false,
    reason: 'concurrency',
    retryAfterSeconds: 5
  });
  if (first.allowed) {
    first.release();
    first.release();
  }
  assert.equal(limiter.begin(input()).allowed, true);
});

test('enforces minute and daily budgets independently', () => {
  const limiter = new ExpensiveApiLimiter(config, 'test-pepper');
  const first = limiter.begin(input());
  assert.equal(first.allowed, true);
  if (first.allowed) first.release();
  const second = limiter.begin(input());
  assert.equal(second.allowed, true);
  if (second.allowed) second.release();
  assert.equal(limiter.begin(input()).allowed, false);

  const afterWindow = input(input().now + 61_000);
  const third = limiter.begin(afterWindow);
  assert.equal(third.allowed, true);
  if (third.allowed) third.release();
  const dailyBlocked = limiter.begin({
    ...afterWindow,
    sessionId: 'session-2'
  });
  assert.equal(dailyBlocked.allowed, false);
  if (!dailyBlocked.allowed) assert.equal(dailyBlocked.reason, 'daily_budget');
});

test('keeps scopes in separate budgets', () => {
  const limiter = new ExpensiveApiLimiter(config, 'test-pepper');
  const first = limiter.begin(input());
  assert.equal(first.allowed, true);
  if (first.allowed) first.release();
  assert.equal(limiter.begin({ ...input(), scope: 'voice' }).allowed, true);
});
