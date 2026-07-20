import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

const mem = new Map<string, string>();

const testLocalStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() {
    return mem.size;
  }
} as Storage;

beforeEach(() => {
  mem.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    testLocalStorage;
  (globalThis as unknown as { window: Window }).window = {
    localStorage: testLocalStorage
  } as unknown as Window;
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'localStorage');
});

test('resolveScholarshipDetailClickBudgetMode', async () => {
  const {
    resolveScholarshipDetailClickBudgetMode
  } = await import('@/lib/scholarships/guestScholarshipDetailClickBudget');

  assert.equal(
    resolveScholarshipDetailClickBudgetMode({
      isAuthenticated: false,
      hasSubscription: false
    }),
    'guest'
  );
  assert.equal(
    resolveScholarshipDetailClickBudgetMode({
      isAuthenticated: false,
      hasSubscription: false,
      authResolved: false
    }),
    null
  );
  assert.equal(
    resolveScholarshipDetailClickBudgetMode({
      isAuthenticated: true,
      hasSubscription: false
    }),
    'signed-in-no-subscription'
  );
  assert.equal(
    resolveScholarshipDetailClickBudgetMode({
      isAuthenticated: true,
      hasSubscription: false,
      authResolved: false
    }),
    null
  );
  assert.equal(
    resolveScholarshipDetailClickBudgetMode({
      isAuthenticated: true,
      hasSubscription: true
    }),
    null
  );
});

test('guest and free tier: zero free detail views — block immediately', async () => {
  const {
    AUTH_NO_SUB_FREE_DETAIL_VIEWS,
    GUEST_FREE_DETAIL_VIEWS,
    shouldBlockScholarshipDetailNavigation,
    getScholarshipDetailFreeClicksUsed,
    getAuthNoSubScholarshipDetailViewsRemaining,
    shouldBlockGuestScholarshipDetailNavigation
  } = await import('@/lib/scholarships/guestScholarshipDetailClickBudget');

  assert.equal(GUEST_FREE_DETAIL_VIEWS, 0);
  assert.equal(AUTH_NO_SUB_FREE_DETAIL_VIEWS, 0);
  assert.equal(getScholarshipDetailFreeClicksUsed('guest'), 0);
  assert.equal(shouldBlockScholarshipDetailNavigation('guest'), true);
  assert.equal(shouldBlockGuestScholarshipDetailNavigation(), true);
  assert.equal(
    shouldBlockScholarshipDetailNavigation('signed-in-no-subscription'),
    true
  );
  assert.equal(getAuthNoSubScholarshipDetailViewsRemaining(), 0);
});
