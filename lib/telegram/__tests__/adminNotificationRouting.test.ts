import assert from 'node:assert/strict';
import test from 'node:test';

import { isTrafficNotifySourceEnabled } from '@/lib/telegram/adminNotificationRouting';

test('yandex_search enabled when organic_search legacy flag is on', () => {
  assert.equal(
    isTrafficNotifySourceEnabled(
      { traffic: true, traffic_sources: { organic_search: true } },
      'yandex_search'
    ),
    true
  );
});

test('yandex_search blocked when explicitly off despite organic_search', () => {
  assert.equal(
    isTrafficNotifySourceEnabled(
      {
        traffic: true,
        traffic_sources: { organic_search: true, yandex_search: false }
      },
      'yandex_search'
    ),
    false
  );
});

test('yandex_search on when toggled directly', () => {
  assert.equal(
    isTrafficNotifySourceEnabled(
      { traffic: true, traffic_sources: { yandex_search: true } },
      'yandex_search'
    ),
    true
  );
});
