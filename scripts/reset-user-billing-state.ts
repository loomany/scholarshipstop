/**
 * Reset a user's billing state for manual testing (no Lemon subscription in DB, profile = free).
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/reset-user-billing-state.ts user@email.com
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types_db';

const emailArg = process.argv[2]?.trim();
if (!emailArg) {
  console.error('Usage: npx tsx scripts/reset-user-billing-state.ts <email>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey);

async function findUserIdByEmail(email: string): Promise<string | null> {
  let page = 1;
  const perPage = 200;
  const target = email.toLowerCase();
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
  const userId = await findUserIdByEmail(emailArg);
  if (!userId) {
    console.error(`No auth user found for email: ${emailArg}`);
    process.exit(1);
  }
  console.log('User id:', userId);

  const { error: delSubErr } = await admin.from('subscriptions').delete().eq('user_id', userId);
  if (delSubErr) {
    console.error('subscriptions delete:', delSubErr.message);
    process.exit(1);
  }
  console.log('Deleted subscription row(s) for user_id (if any).');

  const { error: upErr } = await admin
    .from('profiles')
    .update({
      is_subscribed: false,
      subscription_plan: 'free',
      subscription_debug_plan: null,
      subscription_debug_status: null,
      subscription_debug_renews_at: null,
      subscription_debug_trial_ends_at: null,
      subscription_debug_now: null,
      trial_quota_ai_check_used: 0,
      trial_quota_chat_turns_used: 0,
      trial_quota_humanize_draft_used: 0
    })
    .eq('id', userId);

  if (upErr) {
    console.error('profiles update:', upErr.message);
    process.exit(1);
  }

  console.log('Done: profile set to free / no subscription rows.');
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
