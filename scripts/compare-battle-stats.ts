/**
 * Prints how many compare "battle" pair slots exist under the same rules as enqueue scripts
 * (state vs state, university vs university). Does not mutate the database.
 *
 *   dotenv -e .env.local -- npx tsx scripts/compare-battle-stats.ts
 */

import { countStateComparePairCandidates } from './enqueue-state-compare';
import { countUniversityComparePairCandidates } from './enqueue-university-compare';

async function main() {
  const [states, universities] = await Promise.all([
    countStateComparePairCandidates(),
    countUniversityComparePairCandidates()
  ]);

  const totalPairs = states.pairCandidates + universities.pairCandidates;

  console.log('');
  console.log('Compare battle pair counts (theoretical candidates, same rules as enqueue):');
  console.log(
    `  State vs state:   ${states.pairCandidates} pairs (${states.statesWithMinGrants} states with ≥3 active grants each)`
  );
  console.log(
    `  Uni vs uni:       ${universities.pairCandidates} pairs (${universities.institutionsRanked} top institutions after filters)`
  );
  console.log(`  ─────────────────────────────`);
  console.log(`  Total pair slots: ${totalPairs}`);
  console.log('');
  console.log(
    'Note: enqueue skips pairs already in seo_generation_queue or already generated (compare_pages / state_compare_pages).'
  );
  console.log(
    'Run: npm run seo:enqueue-university-compare && npm run seo:enqueue-state-compare'
  );
  console.log('Then sequential generation: npm run seo:compare-battle-sequential');
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
