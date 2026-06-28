import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('utils/auth-email-redirect.server.ts', 'utf8');

test('production auth origins resolve from canonical env before request headers', () => {
  const productionGuard = source.indexOf("process.env.NODE_ENV === 'production'");
  const forwardedHostRead = source.indexOf("h.get('x-forwarded-host')");
  assert.ok(productionGuard >= 0);
  assert.ok(forwardedHostRead > productionGuard);
  assert.match(source, /process\.env\.SITE_URL/);
  assert.match(source, /return SITE_ORIGIN_FALLBACK/);
});
