/**
 * Roll back one autopilot wave from content_translations.
 * Usage: npx tsx scripts/i18n/scholarship-detail-autopilot/rollback-wave.ts --wave=11
 */
import { createClient } from '@supabase/supabase-js';

import { assertPublishGuards, loadEnvLocal } from './env';

function parseWave(): number {
  const arg = process.argv.find((a) => a.startsWith('--wave='));
  const n = Number(arg?.split('=')[1] ?? '0');
  if (!Number.isFinite(n) || n < 1) throw new Error('Pass --wave=N');
  return n;
}

function machineModelForWave(wave: number): string {
  if (process.argv.includes('--relaxed')) {
    return `stage5e-scholarship-autopilot-relaxed-wave-${wave}`;
  }
  return `stage5e-scholarship-autopilot-wave-${wave}`;
}

async function main() {
  loadEnvLocal();
  assertPublishGuards();
  const wave = parseWave();
  const model = machineModelForWave(wave);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await db
    .from('content_translations')
    .delete()
    .eq('source_type', 'scholarship_detail')
    .eq('machine_model', model)
    .select('id');
  if (error) throw error;
  console.log(`[rollback] deleted ${data?.length ?? 0} rows for ${model}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
