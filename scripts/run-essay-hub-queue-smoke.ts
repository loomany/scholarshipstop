/**
 * Ставит в essay_generation_queue 3 стипендии (с essay) и трижды дергает
 * /api/cron/process-essay-queue (локально нужен `npm run dev`).
 *
 * Запуск: dotenv -e .env.local -- npx tsx scripts/run-essay-hub-queue-smoke.ts
 */
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const BASE =
  process.env.ESSAY_HUB_SMOKE_BASE_URL?.trim() || 'http://127.0.0.1:3000';

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function cronSecret(): string {
  const s =
    process.env.ESSAY_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!s) {
    throw new Error('Set ESSAY_CRON_SECRET or CRON_SECRET for cron auth');
  }
  return s;
}

async function main() {
  const supabase = serviceSupabase();
  const secret = cronSecret();

  const { data: rows, error: selErr } = await supabase
    .from('scholarships')
    .select('id, title')
    .or('requires_essay.eq.true,essay_required.eq.true')
    .not('title', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(3);

  if (selErr) throw new Error(selErr.message);

  let picks = rows ?? [];
  if (picks.length < 3) {
    const { data: fallback, error: fbErr } = await supabase
      .from('scholarships')
      .select('id, title')
      .not('title', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(3);
    if (fbErr) throw new Error(fbErr.message);
    picks = fallback ?? [];
  }

  if (picks.length === 0) {
    throw new Error('No scholarships in DB');
  }

  console.log(
    'Queueing:',
    picks.map((p) => ({ id: p.id, title: (p.title ?? '').slice(0, 80) }))
  );

  for (const p of picks) {
    const { error: insErr } = await supabase.from('essay_generation_queue').insert({
      scholarship_id: p.id,
      status: 'pending'
    });
    if (insErr) throw new Error(insErr.message);
  }

  const results: unknown[] = [];
  for (let i = 0; i < picks.length; i += 1) {
    const url = `${BASE.replace(/\/+$/, '')}/api/cron/process-essay-queue?cron_secret=${encodeURIComponent(secret)}`;
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json().catch(() => ({ parseError: true }))) as unknown;
    results.push({ pass: i + 1, status: res.status, body: json });
    console.log(JSON.stringify(results[results.length - 1], null, 2));
  }

  const { data: recent } = await supabase
    .from('essays')
    .select('slug, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\nLast essays in DB (up to 5):');
  console.log(JSON.stringify(recent, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
