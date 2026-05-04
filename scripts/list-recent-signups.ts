/**
 * One-off: list auth users created in the last N hours (default 12).
 * Run: dotenv -e .env.local -- npx tsx scripts/list-recent-signups.ts
 * Optional: dotenv -e .env.local -- npx tsx scripts/list-recent-signups.ts --hours=24
 */
import { createClient } from '@supabase/supabase-js';

const hoursArg = process.argv.find((a) => a.startsWith('--hours='));
const hours = hoursArg ? Math.max(1, Number(hoursArg.split('=')[1]) || 12) : 12;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  type Row = { id: string; email?: string; created_at: string };
  const matches: Row[] = [];
  let page = 1;
  const perPage = 1000;

  while (page <= 200) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    const users = data.users;
    if (users.length === 0) break;

    for (const u of users) {
      const ca = u.created_at;
      if (ca && ca >= since) {
        matches.push({ id: u.id, email: u.email, created_at: ca });
      }
    }

    const last = users[users.length - 1]?.created_at ?? '';
    if (last && last < since) break;
    if (users.length < perPage) break;
    page += 1;
  }

  matches.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  console.log(JSON.stringify({ hours, since, count: matches.length, users: matches }, null, 2));
}

main();
