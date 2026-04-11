/**
 * Lemon API — store test_mode + variants (run from repo root).
 * npx dotenv -e .env.local -- node scripts/lemon-inspect-store-variants.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  const raw = readFileSync(p, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\n/g, '\n');
    if (process.env[m[1]] == null) process.env[m[1]] = v;
  }
}

loadEnvLocal();

const key = process.env.LEMONSQUEEZY_API_KEY?.trim();
const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
const monthly = process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT_ID?.trim();
const quarterly = process.env.NEXT_PUBLIC_LS_QUARTERLY_VARIANT_ID?.trim();
const yearly = process.env.NEXT_PUBLIC_LS_YEARLY_VARIANT_ID?.trim();

if (!key) {
  console.error('Missing LEMONSQUEEZY_API_KEY');
  process.exit(1);
}

async function api(path) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${key}`
    }
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON', res.status, text.slice(0, 200));
    process.exit(1);
  }
  if (!res.ok) {
    console.error('API error', res.status, JSON.stringify(json, null, 2));
    process.exit(1);
  }
  return json;
}

function variantCheckoutUuid(attrs) {
  // Lemon checkout overlay buy links use a checkout id; variant may expose it differently.
  return (
    attrs?.checkout_url ??
    attrs?.buy_now_url ??
    attrs?.url ??
    null
  );
}

const variants = { monthly, quarterly, yearly };

console.log('--- Lemon API (store) ---');
const store = await api(`/stores/${storeId}`);
const sa = store.data?.attributes ?? {};
console.log({
  store_id: store.data?.id,
  name: sa.name,
  domain: sa.domain,
  url: sa.url,
  test_mode: sa.test_mode,
  currency: sa.currency
});

console.log('\n--- Products + variants in this store ---');
const products = await api(`/products?filter[store_id]=${storeId}&page[size]=50`);
const allVariants = [];
for (const prod of products.data ?? []) {
  const pid = prod.id;
  const vlist = await api(`/variants?filter[product_id]=${pid}&page[size]=50`);
  for (const row of vlist.data ?? []) {
    allVariants.push(row);
  }
}
const byId = new Map(allVariants.map((row) => [String(row.id), row]));
for (const row of allVariants) {
  const a = row.attributes ?? {};
  console.log({
    id: row.id,
    name: a.name,
    price: a.price,
    status: a.status
  });
}

console.log('\n--- Env variant IDs vs API ---');
for (const [label, vid] of Object.entries(variants)) {
  if (!vid) continue;
  const hit = byId.get(String(vid));
  console.log(label, vid, hit ? 'OK (found in store)' : 'NOT FOUND in listed variants');
}

for (const [label, vid] of Object.entries(variants)) {
  if (!vid || !byId.get(String(vid))) continue;
  console.log(`\n--- Variant detail ${label} (${vid}) ---`);
  const v = await api(`/variants/${vid}`);
  const a = v.data?.attributes ?? {};
  console.log({
    id: v.data?.id,
    name: a.name,
    test_mode: a.test_mode
  });
  const checkoutHint = variantCheckoutUuid(a);
  if (checkoutHint) console.log('checkout/url field:', String(checkoutHint).slice(0, 200));
}

console.log('\n--- billing.ts ---');
console.log('Checkout URLs are hardcoded in app/actions/billing.ts.');
console.log('If Lemon shows "Test mode", those /checkout/buy/<uuid> links must be the LIVE checkout');
console.log('for your current variants (copy from Lemon → Product → Variant → checkout link).');
