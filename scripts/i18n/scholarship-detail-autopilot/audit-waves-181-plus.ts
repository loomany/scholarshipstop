import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './env';
import { auditRelaxedWaveInDb, relaxedMachineModel } from './load-persisted-wave';
import { suggestNextSafeStartWave } from './worker-start-wave-guard';

async function main() {
  loadEnvLocal();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const waves: number[] = [];
  for (let w = 181; w <= 200; w++) {
    const { count } = await db
      .from('content_translations')
      .select('*', { count: 'exact', head: true })
      .eq('source_type', 'scholarship_detail')
      .in('locale', ['es', 'fr'])
      .eq('machine_model', relaxedMachineModel(w));
    if ((count ?? 0) > 0) waves.push(w);
  }

  const audits = [];
  for (const w of waves) {
    const a = await auditRelaxedWaveInDb(w);
    const scholarships = a.distinctSourceIds;
    const accepted =
      a.total === scholarships * 2 &&
      a.es === scholarships &&
      a.fr === scholarships &&
      a.qualityBelow85 === 0 &&
      (a.statuses.published ?? 0) === a.total;
    audits.push({
      wave: w,
      total: a.total,
      es: a.es,
      fr: a.fr,
      scholarships,
      statuses: a.statuses,
      qualityBelow85: a.qualityBelow85,
      accepted
    });
  }

  const nextSafe = await suggestNextSafeStartWave(181);
  console.log(JSON.stringify({ waves: audits, nextSafeStartWave: nextSafe }, null, 2));
}

main();
