import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HUB_INTERNATIONAL_SEGMENT,
  HUB_PATH_PREFIX,
  hubPathToTab,
  hubResolvedFromPathname,
  legacyTabQueryToHubPath,
  tabToHubPath
} from '@/app/scholarships/scholarshipHubPath';

test('HUB_PATH_PREFIX', () => {
  assert.equal(HUB_PATH_PREFIX, 'hub');
});

test('tabToHubPath maps known tabs to /scholarships/hub/{slug}', () => {
  assert.equal(tabToHubPath('matches'), '/scholarships/hub/matches');
  assert.equal(tabToHubPath('easy-apply'), '/scholarships/hub/easy-apply');
  assert.equal(tabToHubPath('best-recommendation'), '/scholarships/hub/best-recommendation');
  assert.equal(tabToHubPath('hot-deadlines'), '/scholarships/hub/hot-deadlines');
  assert.equal(tabToHubPath('saved'), '/scholarships/hub/saved');
  assert.equal(tabToHubPath('ignored'), '/scholarships/hub/ignored');
});

test('tabToHubPath international-friendly segment', () => {
  assert.equal(
    tabToHubPath(HUB_INTERNATIONAL_SEGMENT),
    '/scholarships/hub/international-friendly'
  );
});

test('hubPathToTab parses hub/{segment}', () => {
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, 'matches']), {
    tab: 'matches',
    audience: 'any'
  });
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, 'easy-apply']), {
    tab: 'easy-apply',
    audience: 'any'
  });
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, 'best-recommendation']), {
    tab: 'best-recommendation',
    audience: 'any'
  });
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, 'hot-deadlines']), {
    tab: 'hot-deadlines',
    audience: 'any'
  });
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, 'saved']), {
    tab: 'saved',
    audience: 'any'
  });
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, 'ignored']), {
    tab: 'ignored',
    audience: 'any'
  });
});

test('hubPathToTab international-friendly → matches + international audience', () => {
  assert.deepEqual(hubPathToTab([HUB_PATH_PREFIX, HUB_INTERNATIONAL_SEGMENT]), {
    tab: 'matches',
    audience: 'international_friendly'
  });
});

test('hubPathToTab rejects bad shapes', () => {
  assert.equal(hubPathToTab([]), null);
  assert.equal(hubPathToTab(['hub']), null);
  assert.equal(hubPathToTab(['hub', 'matches', 'extra']), null);
  assert.equal(hubPathToTab(['wrong', 'matches']), null);
  assert.equal(hubPathToTab(['hub', 'not-a-real-tab']), null);
});

test('legacyTabQueryToHubPath: tab+scope+catalog → hub path without tab/scope', () => {
  const sp = new URLSearchParams('tab=easy-apply&scope=catalog');
  assert.deepEqual(legacyTabQueryToHubPath(sp), {
    pathname: '/scholarships/hub/easy-apply',
    search: ''
  });
});

test('legacyTabQueryToHubPath: keeps other params, drops tab and scope', () => {
  const sp = new URLSearchParams(
    'tab=easy-apply&scope=catalog&page=2&sort=closest_deadline&q=test'
  );
  const got = legacyTabQueryToHubPath(sp)!;
  assert.equal(got.pathname, '/scholarships/hub/easy-apply');
  const rest = new URLSearchParams(got.search);
  assert.equal(rest.get('page'), '2');
  assert.equal(rest.get('sort'), 'closest_deadline');
  assert.equal(rest.get('q'), 'test');
  assert.equal(rest.get('tab'), null);
  assert.equal(rest.get('scope'), null);
});

test('legacyTabQueryToHubPath: matches + aud international → international-friendly path', () => {
  const sp = new URLSearchParams('tab=matches&aud=international_friendly');
  assert.deepEqual(legacyTabQueryToHubPath(sp), {
    pathname: '/scholarships/hub/international-friendly',
    search: ''
  });
});

test('legacyTabQueryToHubPath: no tab param → null', () => {
  assert.equal(
    legacyTabQueryToHubPath(new URLSearchParams('scope=catalog')),
    null
  );
});

test('hubResolvedFromPathname matches pathname /scholarships/hub/...', () => {
  assert.deepEqual(hubResolvedFromPathname('/scholarships/hub/easy-apply'), {
    tab: 'easy-apply',
    audience: 'any'
  });
  assert.deepEqual(
    hubResolvedFromPathname('/scholarships/hub/international-friendly'),
    { tab: 'matches', audience: 'international_friendly' }
  );
  assert.equal(hubResolvedFromPathname('/scholarships'), null);
  assert.equal(hubResolvedFromPathname('/scholarships/easy-apply'), null);
  assert.equal(hubResolvedFromPathname(null), null);
});
