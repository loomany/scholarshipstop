import crypto from 'crypto';

export function normalizeLemonSignature(signature: string): string {
  return signature.replace(/^sha256=/i, '').trim().toLowerCase();
}

function secretFingerprint(secret: string) {
  return crypto.createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 12);
}

export function createLemonSignature(rawBody: string | Uint8Array, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  if (typeof rawBody === 'string') {
    hmac.update(rawBody, 'utf8');
  } else {
    hmac.update(rawBody);
  }
  return hmac.digest('hex');
}

export function getLemonSignatureDebug(params: {
  rawBody: string | Uint8Array;
  signatureHeader: string;
  secret: string;
}) {
  const signature = normalizeLemonSignature(params.signatureHeader);
  const computed = createLemonSignature(params.rawBody, params.secret);
  return {
    hasValidSignatureFormat: /^[a-f0-9]{64}$/.test(signature),
    signaturePrefix: signature.slice(0, 12),
    signatureLength: signature.length,
    computedPrefix: computed.slice(0, 12),
    bodyLength: typeof params.rawBody === 'string' ? params.rawBody.length : params.rawBody.byteLength,
    secretFingerprint: secretFingerprint(params.secret),
    matches: signature === computed
  };
}

export function validateLemonSignature(params: {
  rawBody: string | Uint8Array;
  signatureHeader: string;
  secret: string;
}): boolean {
  const signature = normalizeLemonSignature(params.signatureHeader);
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;

  const computed = createLemonSignature(params.rawBody, params.secret);
  const signatureBuffer = Buffer.from(signature, 'hex');
  const computedBuffer = Buffer.from(computed, 'hex');
  if (signatureBuffer.length !== computedBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, computedBuffer);
}
