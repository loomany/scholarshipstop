import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  createLemonSignature,
  getLemonSignatureDebug,
  validateLemonSignature
} from '@/lib/payments/lemonWebhookSignature';

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

test('accepts valid signature for raw bytes', () => {
  const rawBody = JSON.stringify({ ping: true, emoji: 'ok' });
  const rawBytes = new TextEncoder().encode(rawBody);
  const secret = 'bytes_secret';
  const signature = createLemonSignature(rawBytes, secret);

  assert.equal(
    validateLemonSignature({
      rawBody: rawBytes,
      signatureHeader: signature,
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

test('returns safe signature debug metadata', () => {
  const rawBody = JSON.stringify({ ping: true });
  const secret = 'another_secret';
  const signature = createLemonSignature(rawBody, secret);
  const secretFingerprint = crypto
    .createHash('sha256')
    .update(secret, 'utf8')
    .digest('hex')
    .slice(0, 12);

  assert.deepEqual(getLemonSignatureDebug({ rawBody, signatureHeader: signature, secret }), {
    hasValidSignatureFormat: true,
    signaturePrefix: signature.slice(0, 12),
    signatureLength: 64,
    computedPrefix: signature.slice(0, 12),
    bodyLength: rawBody.length,
    secretFingerprint,
    matches: true
  });
});
