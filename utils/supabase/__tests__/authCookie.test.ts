import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasSupabaseAuthCookie,
  isSupabaseAuthCookieName
} from '@/utils/supabase/authCookie';

test('recognizes current chunked Supabase auth cookie names', () => {
  assert.equal(isSupabaseAuthCookieName('sb-projectref-auth-token'), true);
  assert.equal(isSupabaseAuthCookieName('sb-projectref-auth-token.0'), true);
  assert.equal(isSupabaseAuthCookieName('sb-projectref-auth-token.12'), true);
});

test('recognizes legacy Supabase auth cookie names', () => {
  assert.equal(isSupabaseAuthCookieName('sb-access-token'), true);
  assert.equal(isSupabaseAuthCookieName('sb-refresh-token'), true);
});

test('ignores unrelated and empty cookies', () => {
  assert.equal(isSupabaseAuthCookieName('cookie-consent'), false);
  assert.equal(
    hasSupabaseAuthCookie([
      { name: 'cookie-consent', value: 'yes' },
      { name: 'sb-projectref-auth-token', value: '' }
    ]),
    false
  );
});

test('finds a non-empty auth cookie among unrelated cookies', () => {
  assert.equal(
    hasSupabaseAuthCookie([
      { name: 'cookie-consent', value: 'yes' },
      { name: 'sb-projectref-auth-token.0', value: 'session-chunk' }
    ]),
    true
  );
});
