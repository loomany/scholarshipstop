/**
 * Smoke test: Lemon webhook route reachable + signature behavior.
 *
 * Usage (loads .env.local via dotenv-cli):
 *   npm run test:webhook:delivery
 *
 * Optional:
 *   WEBHOOK_BASE=https://YOUR-SUBDOMAIN.ngrok-free.app npm run test:webhook:delivery
 *
 * Notes:
 * - Requests WITHOUT `x-signature` always get 400 ("Invalid signature"). LEMON_WEBHOOK_SKIP_SIGNATURE
 *   only bypasses verification when a signature header IS present but wrong (dev only).
 * - Signed body must be the exact JSON string used for HMAC (same bytes as the request body).
 */

const crypto = require('crypto');

const base = (process.env.WEBHOOK_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '');
const url = `${base}/api/webhooks`;

function signRawBody(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

/** Same shape as Lemon invoice + subscription_payment_success (handler returns 200 ignored). */
function buildMockPayload() {
  return {
    meta: {
      event_name: 'subscription_payment_success',
      test_mode: true,
      custom_data: { user_id: '00000000-0000-0000-0000-000000000001' }
    },
    data: {
      id: '999999',
      type: 'subscription-invoices',
      attributes: {
        status: 'paid',
        updated_at: new Date().toISOString(),
        store_id: 1,
        test_mode: true
      }
    }
  };
}

async function run() {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  const rawBody = JSON.stringify(buildMockPayload());

  console.log('Target:', url);
  console.log('');

  let res;
  let text;

  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: rawBody
    });
    text = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[A] Unsigned POST — connection failed:', msg);
    console.error('    Is Next.js listening? (npm run dev). If using ngrok: WEBHOOK_BASE=https://... npm run test:webhook:delivery');
    process.exitCode = 1;
    return;
  }

  console.log('[A] Unsigned POST (no x-signature)');
  console.log('    Status:', res.status, res.statusText);
  console.log('    Body:', text.slice(0, 240));
  if (res.status !== 400) {
    console.log('    Expected 400 — route should reject missing signature.');
  }
  console.log('');

  if (!secret) {
    console.error('[B] Skipped: set LEMON_SQUEEZY_WEBHOOK_SECRET (use npm run test:webhook:delivery so .env.local loads).');
    process.exitCode = res.status === 400 ? 0 : 1;
    return;
  }

  const signature = signRawBody(rawBody, secret);
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature
      },
      body: rawBody
    });
    text = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[B] Signed POST — connection failed:', msg);
    process.exitCode = 1;
    return;
  }

  console.log('[B] Signed POST (x-signature = HMAC-SHA256 hex of raw JSON body)');
  console.log('    Status:', res.status, res.statusText);
  console.log('    Body:', text.slice(0, 500));
  if (res.status === 400 && text.includes('Invalid signature')) {
    console.log('');
    console.log('    Secret mismatch: LEMON_SQUEEZY_WEBHOOK_SECRET must equal the Signing secret');
    console.log('    from Lemon Squeezy → Settings → Webhooks → your endpoint (not the API key).');
  }
  if (res.status === 200) {
    console.log('');
    console.log('    OK — handler responded 200. Check dev terminal for [lemon:webhook] logs if any.');
  }

  process.exitCode = res.ok ? 0 : 1;
}

run();
