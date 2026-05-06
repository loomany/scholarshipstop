import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('scholarships route does not use dynamic auth APIs inside unstable_cache', () => {
  const routePath = join(process.cwd(), 'app', 'api', 'scholarships', 'route.ts');
  const source = readFileSync(routePath, 'utf8');

  const cacheBlocks = [...source.matchAll(/unstable_cache\s*\(([\s\S]*?)\)\s*[,;]/g)];
  for (const block of cacheBlocks) {
    const body = block[1] ?? '';
    assert.equal(
      /\bcreateClient\s*\(/.test(body),
      false,
      'createClient() must not appear inside unstable_cache'
    );
    assert.equal(
      /\bcookies\s*\(/.test(body),
      false,
      'cookies() must not appear inside unstable_cache'
    );
    assert.equal(
      /\bheaders\s*\(/.test(body),
      false,
      'headers() must not appear inside unstable_cache'
    );
  }
});
