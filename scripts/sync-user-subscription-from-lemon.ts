/**
 * GET /v1/subscriptions/:id from Lemon and upsert `subscriptions` + `profiles` (same as webhook sync).
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/sync-user-subscription-from-lemon.ts user@example.com
 */
import { createClient } from '@supabase/supabase-js';

import {
  decideSubscriptionUpdate,
  lemonRestDocumentToWebhookPayload
} from '../lib/payments/lemonSubscriptionState';
import { pickCanonicalSubscription } from '../lib/payments/subscriptionAccess';
import type { Database, Tables } from '../types_db';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

const email = process.argv[2]?.trim();
if (!email) {
  console.error('Usage: npx tsx scripts/sync-user-subscription-from-lemon.ts <email>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!apiKey) {
  console.error('Missing LEMONSQUEEZY_API_KEY.');
  process.exit(1);
}

const admin = createClient<Database>(url, key);

async function findUserIdByEmail(targetEmail: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  const target = targetEmail.toLowerCase();
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === target);
    if (u) return u.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function main() {
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    console.error(JSON.stringify({ ok: false, error: 'User not found', email }));
    process.exit(1);
  }

  const { data: rows, error: qErr } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created', { ascending: false })
    .limit(20);

  if (qErr) throw qErr;

  const canonical = pickCanonicalSubscription(rows ?? []) as Tables<'subscriptions'> | null;
  if (!canonical || canonical.provider !== 'lemon_squeezy') {
    console.error(
      JSON.stringify({
        ok: false,
        error: 'No Lemon Squeezy subscription row for user',
        userId,
        rowCount: rows?.length ?? 0
      })
    );
    process.exit(1);
  }

  const subscriptionId = canonical.id.trim();
  console.info(
    JSON.stringify(
      {
        email,
        userId,
        subscriptionId,
        test_mode: canonical.test_mode,
        status: canonical.status
      },
      null,
      2
    )
  );

  let res: Response;
  try {
    res = await fetch(`${LEMON_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`
      }
    });
  } catch (e) {
    console.error('GET /subscriptions failed', e);
    process.exit(1);
  }

  const rawText = await res.text();
  if (!res.ok) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          httpStatus: res.status,
          body: rawText.slice(0, 800)
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText) as unknown;
  } catch {
    console.error('Invalid JSON from Lemon');
    process.exit(1);
  }

  const payload = lemonRestDocumentToWebhookPayload(json, userId);
  if (!payload) {
    console.error(JSON.stringify({ ok: false, error: 'Could not wrap Lemon response' }));
    process.exit(1);
  }

  const decision = decideSubscriptionUpdate(payload);
  if (decision.kind !== 'upsert') {
    console.error(JSON.stringify({ ok: false, decision: decision.kind }));
    process.exit(1);
  }

  const { error: subErr } = await admin
    .from('subscriptions')
    .upsert([decision.subscription], { onConflict: 'id' });

  if (subErr) {
    console.error('subscriptions upsert failed', subErr);
    process.exit(1);
  }

  const { error: profErr } = await admin.from('profiles').upsert(
    [
      {
        id: decision.userId,
        is_subscribed: decision.isSubscribed,
        subscription_plan: decision.subscriptionPlan
      }
    ],
    { onConflict: 'id' }
  );

  if (profErr) {
    console.error('profiles upsert failed', profErr);
    process.exit(1);
  }

  console.info(
    JSON.stringify(
      {
        ok: true,
        subscriptionId,
        userId,
        profile: {
          is_subscribed: decision.isSubscribed,
          subscription_plan: decision.subscriptionPlan
        }
      },
      null,
      2
    )
  );
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
