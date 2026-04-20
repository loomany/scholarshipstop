/**
 * Create or update a Supabase Auth user (email + password) and force free billing state.
 * For local / staging manual QA only — requires service role.
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/create-dev-auth-user.ts <email> <password>
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types_db';

const emailArg = process.argv[2]?.trim().toLowerCase();
const passwordArg = process.argv[3];
if (!emailArg || !passwordArg) {
  console.error(
    'Usage: npx dotenv-cli -e .env.local -- npx tsx scripts/create-dev-auth-user.ts <email> <password>'
  );
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

async function ensureFreeProfile(userId: string) {
  const { error: upErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        email_verified: true,
        is_subscribed: false,
        subscription_plan: 'free',
        subscription_debug_plan: null,
        subscription_debug_status: null,
        subscription_debug_renews_at: null,
        subscription_debug_trial_ends_at: null,
        subscription_debug_now: null,
        trial_quota_ai_check_used: 0,
        trial_quota_chat_turns_used: 0,
        trial_quota_humanize_draft_used: 0,
        onboarding_completed: false
      },
      { onConflict: 'id' }
    );
  if (upErr) throw new Error(`profiles upsert: ${upErr.message}`);
}

async function clearSubscriptions(userId: string) {
  const { error } = await admin.from('subscriptions').delete().eq('user_id', userId);
  if (error) throw new Error(`subscriptions delete: ${error.message}`);
}

async function main() {
  let userId = await findUserIdByEmail(emailArg);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailArg,
      password: passwordArg,
      email_confirm: true
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error('createUser returned no user id');
    userId = data.user.id;
    console.log('Created auth user:', userId);
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: passwordArg,
      email_confirm: true
    });
    if (error) throw error;
    console.log('Updated password for existing user:', userId);
  }

  await clearSubscriptions(userId);
  await ensureFreeProfile(userId);

  console.log('Done: subscriptions cleared, profile = free / not subscribed.');
}

void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
