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
    null
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

test('guest: detail budget disabled (unlimited detail views)', async () => {
  const {
    AUTH_NO_SUB_FREE_DETAIL_VIEWS,
    resolveScholarshipDetailClickBudgetMode,
    shouldBlockScholarshipDetailNavigation,
    recordScholarshipDetailFreeNavigation,
    shouldBlockGuestScholarshipDetailNavigation
  } = await import('@/lib/scholarships/guestScholarshipDetailClickBudget');

  assert.equal(AUTH_NO_SUB_FREE_DETAIL_VIEWS, 10);
  assert.equal(
    resolveScholarshipDetailClickBudgetMode({
      isAuthenticated: false,
      hasSubscription: false
    }),
    null
  );
  // Legacy direct guest-mode helpers must not block either.
  for (let i = 0; i < 20; i += 1) {
    recordScholarshipDetailFreeNavigation('guest');
  }
  assert.equal(shouldBlockScholarshipDetailNavigation('guest'), false);
  assert.equal(shouldBlockGuestScholarshipDetailNavigation(), false);
});

test('signed-in no sub: allows AUTH_NO_SUB_FREE_DETAIL_VIEWS navigations before block', async () => {
  const {
    AUTH_NO_SUB_FREE_DETAIL_VIEWS,
    shouldBlockScholarshipDetailNavigation,
    getScholarshipDetailFreeClicksUsed,
    recordScholarshipDetailFreeNavigation,
    getAuthNoSubScholarshipDetailViewsRemaining
  } = await import('@/lib/scholarships/guestScholarshipDetailClickBudget');

  for (let i = 0; i < AUTH_NO_SUB_FREE_DETAIL_VIEWS; i += 1) {
    assert.equal(shouldBlockScholarshipDetailNavigation('signed-in-no-subscription'), false);
    recordScholarshipDetailFreeNavigation('signed-in-no-subscription');
  }
  assert.equal(
    getScholarshipDetailFreeClicksUsed('signed-in-no-subscription'),
    AUTH_NO_SUB_FREE_DETAIL_VIEWS
  );
  assert.equal(getAuthNoSubScholarshipDetailViewsRemaining(), 0);
  assert.equal(shouldBlockScholarshipDetailNavigation('signed-in-no-subscription'), true);
});
