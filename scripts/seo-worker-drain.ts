import { execFileSync } from 'child_process';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

const DEFAULT_BATCH = 500;

function loadAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function argNum(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const n = parseInt(raw.slice(name.length + 3), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function countPending(admin: ReturnType<typeof loadAdmin>): Promise<number> {
  const { count, error } = await admin
    .from('seo_generation_queue')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  const admin = loadAdmin();
  const batchSize = Math.max(1, Math.min(argNum('limit', DEFAULT_BATCH), 2000));

  for (let iteration = 1; ; iteration += 1) {
    const pending = await countPending(admin);
    if (pending <= 0) {
      console.log('seo_generation_queue is empty. Drain finished.');
      return;
    }

    const limit = Math.min(batchSize, pending);
    console.log(
      `[drain] iteration=${iteration} pending=${pending} running worker with --limit=${limit}`
    );

    execFileSync('npm', ['run', 'seo:worker-generate', '--', `--limit=${limit}`], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
