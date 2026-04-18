/**
 * Enqueue state compare SEO pages from seeded U.S. states + DC.
 *
 * Examples:
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-state-compare.ts --dry-run
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-state-compare.ts --limit=20
 */

import { createClient } from '@supabase/supabase-js';

import { canonicalStateVsSlug } from '../lib/seo/stateCompareSlug';
import type { Database, Json } from '../types_db';

const MIN_GRANTS_PER_SIDE = 3;
const INSERT_RETRY_MAX = 4;

type Admin = ReturnType<typeof loadAdmin>;

type StateRow = Pick<
  Database['public']['Tables']['states']['Row'],
  'id' | 'name' | 'slug' | 'code' | 'region'
>;

type StateGrantCountRow =
  Database['public']['Functions']['scholarship_active_counts_by_state_code']['Returns'][number];

type StateCompareRoot = {
  error?: string;
  state_a?: { grant_count?: number | null } | null;
  state_b?: { grant_count?: number | null } | null;
};

type RankedState = StateRow & {
  activeGrantCount: number;
};

type PairCandidate = {
  stateA: RankedState;
  stateB: RankedState;
  canonicalSlug: string;
  canonicalPath: string;
  seedPriority: number;
};

function loadAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--limit' && argv[i + 1]) {
      limit = Math.max(1, Number.parseInt(argv[i + 1], 10) || 1);
      i += 1;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      limit = Math.max(1, Number.parseInt(arg.slice('--limit='.length), 10) || 1);
    }
  }

  return { limit, dryRun };
}

function isTransientPostgrestError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('<!doctype') ||
    m.includes('<html') ||
    m.includes('bad gateway') ||
    m.includes('cloudflare') ||
    /\b502\b|\b503\b|\b504\b|\b524\b/.test(m)
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertQueueRowWithRetry(
  admin: Admin,
  row: {
    canonical_path: string;
    filters: Json;
    priority: number;
    grant_count: number;
    status: 'pending';
  }
) {
  for (let attempt = 1; attempt <= INSERT_RETRY_MAX; attempt += 1) {
    const { error } = await admin.from('seo_generation_queue').insert(row);
    if (!error) {
      return { ok: true as const };
    }
    if (error.code === '23505') {
      return { ok: false as const, duplicate: true as const };
    }
    if (!isTransientPostgrestError(error.message) || attempt === INSERT_RETRY_MAX) {
      return { ok: false as const, duplicate: false as const, message: error.message };
    }
    await sleep(500 * 2 ** (attempt - 1));
  }
  return { ok: false as const, duplicate: false as const, message: 'insert retry exhausted' };
}

async function fetchRankedStates(admin: Admin): Promise<RankedState[]> {
  const [{ data: states, error: statesErr }, { data: counts, error: countsErr }] =
    await Promise.all([
      admin.from('states').select('id, name, slug, code, region').order('name'),
      admin.rpc('scholarship_active_counts_by_state_code')
    ]);

  if (statesErr) throw new Error(statesErr.message);
  if (countsErr) throw new Error(countsErr.message);

  const countMap = new Map(
    ((counts ?? []) as StateGrantCountRow[]).map((row) => [
      row.state_code.toUpperCase(),
      Number(row.grant_count ?? 0)
    ])
  );

  return ((states ?? []) as StateRow[])
    .map((state) => ({
      ...state,
      activeGrantCount: countMap.get(state.code.toUpperCase()) ?? 0
    }))
    .filter((state) => state.activeGrantCount >= MIN_GRANTS_PER_SIDE)
    .sort((a, b) => {
      if (b.activeGrantCount !== a.activeGrantCount) {
        return b.activeGrantCount - a.activeGrantCount;
      }
      return a.slug.localeCompare(b.slug, 'en');
    });
}

function buildPairCandidates(states: RankedState[]): PairCandidate[] {
  const pairs: PairCandidate[] = [];
  for (let i = 0; i < states.length; i += 1) {
    for (let j = i + 1; j < states.length; j += 1) {
      const left = states[i];
      const right = states[j];
      const canonicalSlug = canonicalStateVsSlug(`${left.slug}-vs-${right.slug}`);
      if (!canonicalSlug) continue;

      pairs.push({
        stateA: left,
        stateB: right,
        canonicalSlug,
        canonicalPath: `compare/states/${canonicalSlug}`,
        seedPriority: left.activeGrantCount + right.activeGrantCount
      });
    }
  }

  pairs.sort((a, b) => {
    if (b.seedPriority !== a.seedPriority) return b.seedPriority - a.seedPriority;
    return a.canonicalSlug.localeCompare(b.canonicalSlug, 'en');
  });

  return pairs;
}

async function fetchExistingQueuePaths(admin: Admin) {
  const existing = new Set<string>();
  const { data, error } = await admin
    .from('seo_generation_queue')
    .select('canonical_path');
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const path = row.canonical_path?.trim().toLowerCase();
    if (path) existing.add(path);
  }
  return existing;
}

async function fetchCompletedCompareSlugs(admin: Admin) {
  const completed = new Set<string>();
  const { data, error } = await admin
    .from('state_compare_pages')
    .select('slug, status, ai_verdict');
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const slug = row.slug?.trim().toLowerCase();
    if (!slug) continue;
    if (row.status === 'published' || Boolean(row.ai_verdict?.trim())) {
      completed.add(slug);
    }
  }
  return completed;
}

async function main() {
  const { limit, dryRun } = parseArgs();
  const admin = loadAdmin();

  const rankedStates = await fetchRankedStates(admin);
  const pairCandidates = buildPairCandidates(rankedStates);
  const existingQueuePaths = await fetchExistingQueuePaths(admin);
  const completedCompareSlugs = await fetchCompletedCompareSlugs(admin);

  console.log(
    `Ranked states: ${rankedStates.length}; total unique pairs: ${pairCandidates.length}.`
  );
  console.log(
    `Existing queue paths: ${existingQueuePaths.size}; completed state compare pages: ${completedCompareSlugs.size}.`
  );
  if (limit != null) {
    console.log(`Insert limit: ${limit} eligible pair(s).`);
  }
  if (dryRun) {
    console.log('Dry run enabled: no DB inserts will be made.');
  }
  console.log('');

  let examined = 0;
  let rpcEligible = 0;
  let skippedExisting = 0;
  let inserted = 0;
  let rpcFailures = 0;

  for (const pair of pairCandidates) {
    if (limit != null && inserted >= limit) break;

    const pathKey = pair.canonicalPath.toLowerCase();
    if (existingQueuePaths.has(pathKey) || completedCompareSlugs.has(pair.canonicalSlug)) {
      skippedExisting += 1;
      continue;
    }

    examined += 1;
    const { data, error } = await admin.rpc('get_state_comparison_data', {
      p_state_a_code: pair.stateA.code,
      p_state_b_code: pair.stateB.code
    });

    if (error || !data) {
      rpcFailures += 1;
      console.warn(`[rpc-fail] ${pair.canonicalSlug}: ${error?.message ?? 'no data'}`);
      continue;
    }

    const root = data as StateCompareRoot;
    if (root.error) {
      rpcFailures += 1;
      console.warn(`[rpc-fail] ${pair.canonicalSlug}: ${root.error}`);
      continue;
    }

    const leftCount = Number(root.state_a?.grant_count ?? 0);
    const rightCount = Number(root.state_b?.grant_count ?? 0);

    if (leftCount < MIN_GRANTS_PER_SIDE || rightCount < MIN_GRANTS_PER_SIDE) {
      continue;
    }

    rpcEligible += 1;

    const filters = {
      source: 'enqueue-state-compare',
      compareSlug: pair.canonicalSlug,
      stateA: {
        code: pair.stateA.code,
        slug: pair.stateA.slug,
        name: pair.stateA.name,
        region: pair.stateA.region,
        activeGrantCount: leftCount
      },
      stateB: {
        code: pair.stateB.code,
        slug: pair.stateB.slug,
        name: pair.stateB.name,
        region: pair.stateB.region,
        activeGrantCount: rightCount
      },
      minGrantsPerState: MIN_GRANTS_PER_SIDE
    } satisfies Json;

    if (dryRun) {
      console.log(
        `[dry-run] enqueue ${pathKey} (${pair.stateA.code}:${leftCount} vs ${pair.stateB.code}:${rightCount})`
      );
      inserted += 1;
      continue;
    }

    const insertResult = await insertQueueRowWithRetry(admin, {
      canonical_path: pathKey,
      filters,
      priority: leftCount + rightCount,
      grant_count: leftCount + rightCount,
      status: 'pending'
    });

    if (!insertResult.ok) {
      if (insertResult.duplicate) {
        skippedExisting += 1;
        existingQueuePaths.add(pathKey);
        continue;
      }
      console.warn(`[insert-fail] ${pathKey}: ${insertResult.message}`);
      continue;
    }

    existingQueuePaths.add(pathKey);
    inserted += 1;
    console.log(
      `[queued] ${pathKey} (${pair.stateA.code}:${leftCount} vs ${pair.stateB.code}:${rightCount})`
    );
  }

  console.log('');
  console.log(
    [
      `Summary: examined=${examined}`,
      `eligible_via_rpc=${rpcEligible}`,
      `skipped_existing=${skippedExisting}`,
      `rpc_failures=${rpcFailures}`,
      dryRun ? `would_insert=${inserted}` : `inserted=${inserted}`
    ].join(', ')
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
