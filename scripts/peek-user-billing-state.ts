import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types_db';

const email = process.argv[2]?.trim();
if (!email) {
  console.error('Usage: npx tsx scripts/peek-user-billing-state.ts <email>');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient<Database>(url, key);

async function main() {
  let page = 1;
  const perPage = 200;
  const target = email.toLowerCase();
  let userId: string | null = null;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === target);
    if (u) {
      userId = u.id;
      break;
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  if (!userId) {
    console.log(JSON.stringify({ found: false, email }, null, 2));
    return;
  }

  const { data: profile } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  const { data: subs } = await admin.from('subscriptions').select('*').eq('user_id', userId);

  console.log(
    JSON.stringify(
      {
        email,
        userId,
        profile: profile
          ? {
              is_subscribed: profile.is_subscribed,
              subscription_plan: profile.subscription_plan,
              updated_at: profile.updated_at
            }
          : null,
        subscriptions: (subs ?? []).map((s) => ({
          id: s.id,
          status: s.status,
          provider: s.provider,
          plan_code: s.plan_code,
          trial_end: s.trial_end,
          renews_at: s.renews_at
        }))
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
