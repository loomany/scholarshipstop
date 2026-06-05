import assert from 'node:assert/strict';
import test from 'node:test';

import robots, {
  ROBOTS_PRIVATE_ROUTE_DISALLOW,
  ROBOTS_QUERY_DUPLICATE_DISALLOW
} from '@/app/robots';

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

test('robots keeps sitemap index discoverable and blocks duplicate query crawl traps', () => {
  const result = robots();
  const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const disallow = asArray(rules?.disallow);
  const sitemap = asArray(result.sitemap);

  assert.equal(rules?.userAgent, '*');
  assert.equal(rules?.allow, '/');
  assert.ok(sitemap.some((url) => url.endsWith('/sitemap.xml')));

  for (const pattern of ROBOTS_PRIVATE_ROUTE_DISALLOW) {
    assert.ok(disallow.includes(pattern), `missing private route ${pattern}`);
  }
  for (const pattern of ROBOTS_QUERY_DUPLICATE_DISALLOW) {
    assert.ok(disallow.includes(pattern), `missing query pattern ${pattern}`);
  }
});
