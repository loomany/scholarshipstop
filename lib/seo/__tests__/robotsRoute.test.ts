import assert from 'node:assert/strict';
import test from 'node:test';

import robots, {
  ROBOTS_AI_CRAWLER_USER_AGENTS,
  ROBOTS_PRIVATE_ROUTE_DISALLOW
} from '@/app/robots';

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

test('robots keeps public query variants crawlable so canonical and noindex can be seen', () => {
  const result = robots();
  const rules = asArray(result.rules);
  const wildcardRule = rules.find((rule) => rule.userAgent === '*');
  const aiRule = rules.find((rule) => {
    const agents = asArray(rule.userAgent);
    return ROBOTS_AI_CRAWLER_USER_AGENTS.every((agent) =>
      agents.includes(agent)
    );
  });
  const disallow = asArray(wildcardRule?.disallow);
  const sitemap = asArray(result.sitemap);

  assert.equal(wildcardRule?.allow, '/');
  assert.equal(aiRule?.allow, '/');
  assert.ok(sitemap.some((url) => url.endsWith('/sitemap.xml')));

  for (const pattern of ROBOTS_PRIVATE_ROUTE_DISALLOW) {
    assert.ok(disallow.includes(pattern), `missing private route ${pattern}`);
    assert.ok(
      asArray(aiRule?.disallow).includes(pattern),
      `missing AI private route ${pattern}`
    );
  }
  assert.equal(
    disallow.some((pattern) => pattern.includes('?')),
    false
  );
  assert.equal(
    asArray(aiRule?.disallow).some((pattern) => pattern.includes('?')),
    false
  );
});
