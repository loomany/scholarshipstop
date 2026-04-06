import assert from 'node:assert/strict';
import test from 'node:test';
import { createLemonSignature, validateLemonSignature } from '@/lib/payments/lemonWebhookSignature';

test('accepts valid hex signature', () => {
  const rawBody = JSON.stringify({ hello: 'world' });
  const secret = 'test_secret';
  const signature = createLemonSignature(rawBody, secret);

  assert.equal(
    validateLemonSignature({ rawBody, signatureHeader: signature, secret }),
    true
  );
});

test('accepts valid sha256= prefixed signature', () => {
  const rawBody = JSON.stringify({ ping: true });
  const secret = 'another_secret';
  const signature = createLemonSignature(rawBody, secret);

  assert.equal(
    validateLemonSignature({
      rawBody,
      signatureHeader: `sha256=${signature}`,
      secret
    }),
    true
  );
});

test('rejects invalid signature', () => {
  const rawBody = JSON.stringify({ ping: true });
  const secret = 'another_secret';

  assert.equal(
    validateLemonSignature({
      rawBody,
      signatureHeader: '0'.repeat(64),
      secret
    }),
    false
  );
});

test('rejects malformed signature', () => {
  const rawBody = JSON.stringify({ ping: true });
  const secret = 'another_secret';

  assert.equal(
    validateLemonSignature({
      rawBody,
      signatureHeader: 'not-a-hex-signature',
      secret
    }),
    false
  );
});
