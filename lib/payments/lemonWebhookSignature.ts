import crypto from 'crypto';

export function normalizeLemonSignature(signature: string): string {
  return signature.replace(/^sha256=/i, '').trim().toLowerCase();
}

export function createLemonSignature(rawBody: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
}

export function validateLemonSignature(params: {
  rawBody: string;
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
