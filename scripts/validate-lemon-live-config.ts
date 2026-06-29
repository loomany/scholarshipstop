import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseDotenv } from 'dotenv';

import type { BillingPlanKey } from '@/lib/payments/lemonVariantIds';
import { resolveLemonSubscriptionWebhookConfig } from '@/lib/payments/lemonRuntimeConfig';

const API_BASE = 'https://api.lemonsqueezy.com/v1';
const EXPECTED_WEBHOOK_URL = 'https://scholarshiptop.com/api/webhooks';
const plans: BillingPlanKey[] = ['monthly', 'quarterly', 'yearly'];

type JsonApiResource = {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: string } | null }>;
};

type CheckName =
  | 'LIVE_API_KEY_PRESENT'
  | 'STORE_VERIFIED'
  | 'LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE'
  | 'LIVE_TEST_IDS_DISTINCT'
  | 'PRICES_CURRENCY_VERIFIED'
  | 'WEBHOOK_ON_VPS_VERIFIED';

function envFileArgument(argv: string[]): string | null {
  const inline = argv.find((arg) => arg.startsWith('--env-file='));
  if (inline) return inline.slice('--env-file='.length).trim() || null;
  const index = argv.indexOf('--env-file');
  return index >= 0 ? (argv[index + 1]?.trim() ?? null) : null;
}

function loadSecretFile(fileArgument: string) {
  const path = resolve(fileArgument);
  const stat = statSync(path);
  if (!stat.isFile()) throw new Error('env_file_not_regular');
  if (process.platform !== 'win32' && (stat.mode & 0o077) !== 0) {
    throw new Error('env_file_permissions_must_be_0600');
  }
  const parsed = parseDotenv(readFileSync(path));
  for (const [key, value] of Object.entries(parsed)) process.env[key] = value;
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

async function apiGet(
  path: string,
  apiKey: string
): Promise<{
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
}> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`
    },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`api_http_${response.status}`);
  return (await response.json()) as {
    data?: JsonApiResource | JsonApiResource[];
    included?: JsonApiResource[];
  };
}

function resource(value: JsonApiResource | JsonApiResource[] | undefined) {
  return value && !Array.isArray(value) ? value : null;
}

async function main() {
  const envFile = envFileArgument(process.argv.slice(2));
  if (envFile) loadSecretFile(envFile);

  const results: Record<CheckName, boolean> = {
    LIVE_API_KEY_PRESENT: false,
    STORE_VERIFIED: false,
    LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE: false,
    LIVE_TEST_IDS_DISTINCT: false,
    PRICES_CURRENCY_VERIFIED: false,
    WEBHOOK_ON_VPS_VERIFIED: false
  };
  const reasons: string[] = [];
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim() ?? '';
  results.LIVE_API_KEY_PRESENT = Boolean(apiKey);

  const resolved = resolveLemonSubscriptionWebhookConfig(
    process.env,
    'production'
  );
  if (!resolved.ok) reasons.push(`config_${resolved.reason}`);

  const liveIds = plans.map(
    (plan) =>
      process.env[`LEMON_VARIANT_${plan.toUpperCase()}_LIVE`]?.trim() ?? ''
  );
  const testIds = plans.map(
    (plan) =>
      process.env[`LEMON_VARIANT_${plan.toUpperCase()}_TEST`]?.trim() ?? ''
  );
  results.LIVE_TEST_IDS_DISTINCT =
    liveIds.every((id) => /^\d+$/.test(id)) &&
    testIds.every((id) => /^\d+$/.test(id)) &&
    new Set([...liveIds, ...testIds]).size === liveIds.length + testIds.length;

  if (apiKey && resolved.ok) {
    try {
      const storeDocument = await apiGet(
        `/stores/${encodeURIComponent(resolved.config.storeId)}`,
        apiKey
      );
      const store = resource(storeDocument.data);
      const storeCurrency = String(
        store?.attributes?.currency ?? ''
      ).toUpperCase();
      results.STORE_VERIFIED =
        store?.id === resolved.config.storeId && store?.type === 'stores';

      let variantsVerified = true;
      let pricesVerified = storeCurrency === resolved.config.currency;
      for (const plan of plans) {
        const variantId = resolved.config.variantIds[plan];
        const document = await apiGet(
          `/variants/${encodeURIComponent(variantId)}?include=product`,
          apiKey
        );
        const variant = resource(document.data);
        const productId = variant?.relationships?.product?.data?.id;
        const product = document.included?.find(
          (item) => item.type === 'products' && item.id === productId
        );
        const providerStoreId =
          variant?.relationships?.store?.data?.id ??
          product?.relationships?.store?.data?.id;
        const providerPrice = Number(variant?.attributes?.price);
        const variantOk =
          variant?.id === variantId &&
          variant?.type === 'variants' &&
          variant.attributes?.status === 'published' &&
          variant.attributes?.test_mode === false &&
          providerStoreId === resolved.config.storeId;
        variantsVerified &&= variantOk;
        pricesVerified &&=
          Number.isSafeInteger(providerPrice) &&
          providerPrice === resolved.config.expectedTotals[plan];
      }
      results.LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE = variantsVerified;
      results.PRICES_CURRENCY_VERIFIED = pricesVerified;

      const webhookDocument = await apiGet('/webhooks', apiKey);
      const webhooks = Array.isArray(webhookDocument.data)
        ? webhookDocument.data
        : [];
      results.WEBHOOK_ON_VPS_VERIFIED = webhooks.some((webhook) => {
        const webhookStoreId = webhook.relationships?.store?.data?.id;
        return (
          webhook.type === 'webhooks' &&
          webhook.attributes?.url === EXPECTED_WEBHOOK_URL &&
          webhook.attributes?.test_mode === false &&
          (!webhookStoreId || webhookStoreId === resolved.config.storeId)
        );
      });
    } catch (error) {
      reasons.push(
        error instanceof Error ? error.message : 'api_validation_failed'
      );
    }
  }

  if (apiKey) console.log(`LIVE_API_KEY_FINGERPRINT: ${fingerprint(apiKey)}`);
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${name}: ${passed ? 'YES' : 'NO'}`);
  }
  const safe = Object.values(results).every(Boolean) && reasons.length === 0;
  console.log(`SAFE_TO_ENABLE_LEMON_MODE_LIVE: ${safe ? 'YES' : 'NO'}`);
  if (reasons.length)
    console.error(`VALIDATION_FAILURES: ${reasons.join(',')}`);
  if (!safe) process.exitCode = 1;
}

void main().catch((error) => {
  console.log('LIVE_API_KEY_PRESENT: NO');
  console.log('STORE_VERIFIED: NO');
  console.log('LIVE_VARIANTS_VERIFIED_TEST_MODE_FALSE: NO');
  console.log('LIVE_TEST_IDS_DISTINCT: NO');
  console.log('PRICES_CURRENCY_VERIFIED: NO');
  console.log('WEBHOOK_ON_VPS_VERIFIED: NO');
  console.log('SAFE_TO_ENABLE_LEMON_MODE_LIVE: NO');
  console.error(
    `VALIDATION_FAILURES: ${error instanceof Error ? error.message : 'unexpected'}`
  );
  process.exitCode = 1;
});
