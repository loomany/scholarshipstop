/**
 * One-shot local/prod batch for international file:
 * - Enqueue essay topics (lines 1-140) into manual_essay_generation_queue
 * - Generate + publish keyword SEO (lines 141-240): listings + resource posts
 * - Drain manual essay queue (up to --essay-limit items)
 *
 * Run from repo root (env is usually loaded via: dotenv -e .env.local -- npx tsx ...):
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/run-international-content-bulk.ts
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/run-international-content-bulk.ts --essay-limit=200
 */
import { execSync } from 'node:child_process';

/** Run from repository root (npm scripts and `npx` from the project already do this). */
const ROOT = process.cwd();

function intArg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const n = parseInt(raw.slice(name.length + 3), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function run(title: string, command: string) {
  // eslint-disable-next-line no-console -- batch orchestrator
  console.log(`\n=== ${title} ===\n${command}\n`);
  execSync(command, { cwd: ROOT, stdio: 'inherit', shell: true, env: process.env });
}

const essayLimit = intArg('essay-limit', 200);

run(
  'Enqueue manual essay topics (lines 1–140)',
  'npx tsx scripts/enqueue-manual-essay-guides.ts --from-line=1 --to-line=140'
);
run(
  'Keyword SEO: publish scholarship listings + resource articles (lines 141–240)',
  'npx tsx scripts/generate-keyword-seo-pages.ts --publish --from-line=141 --to-line=240 --limit=200'
);
run(
  `Manual essay worker (up to ${essayLimit} queue items)`,
  `npx tsx scripts/run-manual-essay-guides.ts --limit=${essayLimit}`
);

// eslint-disable-next-line no-console -- batch orchestrator
console.log('\n=== Done (no audits). Run: npm run essay:manual-audit; npx tsx scripts/audit-keyword-seo-pages.ts ===\n');
