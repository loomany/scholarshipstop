/**
 * Enqueue university compare SEO pages from the top institutions by active grant count.
 *
 * Examples:
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-university-compare.ts --dry-run
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-university-compare.ts --limit=20
 *   dotenv -e .env.local -- npx tsx scripts/enqueue-university-compare.ts --limit 20
 */

import { createClient } from '@supabase/supabase-js';

import { canonicalUniversityVsSlug } from '../lib/seo/universityCompareSlug';
import type { Database, Json } from '../types_db';

const PAGE_SIZE = 1000;
const TOP_INSTITUTIONS = 50;
const MIN_GRANTS_PER_SIDE = 3;
const INSERT_RETRY_MAX = 4;

type Admin = ReturnType<typeof loadAdmin>;

type ScholarshipCountRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  'institution_id' | 'is_active'
>;

type InstitutionRow = Pick<
  Database['public']['Tables']['institutions']['Row'],
  'id' | 'slug' | 'name' | 'website_url'
>;

type CompareRoot = {
  error?: string;
  institution_a?: { grant_count?: number | null } | null;
  institution_b?: { grant_count?: number | null } | null;
};

type RankedInstitution = InstitutionRow & {
  activeGrantCount: number;
  rank: number;
};

type PairCandidate = {
  institutionA: RankedInstitution;
  institutionB: RankedInstitution;
  canonicalSlug: string;
  canonicalPath: string;
  seedPriority: number;
};

const UNIVERSITY_NAME_RE =
  /\b(university|college|institute|school|academy|polytechnic|campus)\b/i;
const NON_UNIVERSITY_NAME_RE =
  /\b(foundation|association|society|coalition|fellowship|ministry|church|club|network|center|centre|llc|inc|corp|company|initiative|program|organisation|organization|fund|alumni|trust|council|board|committee|league|athletic|athletics|conference|interscholastic|press|extension)\b/i;

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

function isCliMain(): boolean {
  const a = (process.argv[1] ?? '').replace(/\\/g, '/');
  return a.includes('/enqueue-university-compare.ts');
}

function looksLikeUniversityInstitution(input: {
  slug?: string | null;
  name?: string | null;
  website_url?: string | null;
}): boolean {
  const name = input.name?.trim() ?? '';
  const slug = input.slug?.trim().replace(/-/g, ' ') ?? '';
  const combined = `${name} ${slug}`.trim();
  if (!combined) return false;
  if (NON_UNIVERSITY_NAME_RE.test(combined)) return false;
  const website = input.website_url?.trim();
  if (website) {
    try {
      const host = new URL(website).hostname.toLowerCase();
      if (host.endsWith('.edu') || host.includes('.edu.')) return true;
    } catch {
      // fall back to name-based heuristic below
    }
  }
  return UNIVERSITY_NAME_RE.test(combined);
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

async function fetchActiveGrantCounts(admin: Admin) {
  const counts = new Map<string, number>();
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .from('scholarships')
      .select('institution_id, is_active')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as ScholarshipCountRow[];
    for (const row of batch) {
      if (!row.institution_id) continue;
      if (row.is_active === false) continue;
      counts.set(row.institution_id, (counts.get(row.institution_id) ?? 0) + 1);
    }

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return counts;
}

async function fetchTopInstitutions(admin: Admin): Promise<RankedInstitution[]> {
  const counts = await fetchActiveGrantCounts(admin);
  const rankedIds = [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'en');
    })
    .slice(0, TOP_INSTITUTIONS);

  const idOrder = rankedIds.map(([id]) => id);
  if (idOrder.length === 0) return [];

  const { data, error } = await admin
    .from('institutions')
    .select('id, slug, name, website_url')
    .in('id', idOrder);

  if (error) throw new Error(error.message);

  const byId = new Map(
    ((data ?? []) as InstitutionRow[]).map((row) => [row.id, row] as const)
  );

  return rankedIds
    .map(([id, activeGrantCount], index) => {
      const inst = byId.get(id);
      if (!inst) return null;
      if (!looksLikeUniversityInstitution(inst)) return null;
      return {
        ...inst,
        activeGrantCount,
        rank: index + 1
      } satisfies RankedInstitution;
    })
    .filter((row): row is RankedInstitution => row !== null);
}

function buildPairCandidates(institutions: RankedInstitution[]): PairCandidate[] {
  const pairs: PairCandidate[] = [];

  for (let i = 0; i < institutions.length; i += 1) {
    for (let j = i + 1; j < institutions.length; j += 1) {
      const left = institutions[i];
      const right = institutions[j];
      const canonicalSlug = canonicalUniversityVsSlug(`${left.slug}-vs-${right.slug}`);
      if (!canonicalSlug) continue;

      pairs.push({
        institutionA: left,
        institutionB: right,
        canonicalSlug,
        canonicalPath: `compare/universities/${canonicalSlug}`,
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
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .from('seo_generation_queue')
      .select('canonical_path')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = data ?? [];
    for (const row of batch) {
      const path = row.canonical_path?.trim().toLowerCase();
      if (path) existing.add(path);
    }

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return existing;
}

async function fetchCompletedCompareSlugs(admin: Admin) {
  const completed = new Set<string>();
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .from('compare_pages')
      .select('slug, status, ai_verdict')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const batch = data ?? [];
    for (const row of batch) {
      const slug = row.slug?.trim().toLowerCase();
      if (!slug) continue;
      if (row.status === 'published' || Boolean(row.ai_verdict?.trim())) {
        completed.add(slug);
      }
    }

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return completed;
}

/** Pair count from the same rules as enqueue (top institutions + university-like filter). */
export async function countUniversityComparePairCandidates(): Promise<{
  institutionsRanked: number;
  pairCandidates: number;
}> {
  const admin = loadAdmin();
  const ranked = await fetchTopInstitutions(admin);
  const pairs = buildPairCandidates(ranked);
  return { institutionsRanked: ranked.length, pairCandidates: pairs.length };
}

async function main() {
  const { limit, dryRun } = parseArgs();
  const admin = loadAdmin();

  const topInstitutions = await fetchTopInstitutions(admin);
  if (topInstitutions.length < 2) {
    console.log('Need at least 2 institutions with active grants.');
    return;
  }

  const pairCandidates = buildPairCandidates(topInstitutions);
  const existingQueuePaths = await fetchExistingQueuePaths(admin);
  const completedCompareSlugs = await fetchCompletedCompareSlugs(admin);

  console.log(
    `Top institutions: ${topInstitutions.length}; total unique pairs: ${pairCandidates.length}.`
  );
  console.log(
    `Existing queue paths: ${existingQueuePaths.size}; completed compare pages: ${completedCompareSlugs.size}.`
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
    const { data, error } = await admin.rpc('get_comparison_data', {
      p_inst_a: pair.institutionA.id,
      p_inst_b: pair.institutionB.id
    });

    if (error || !data) {
      rpcFailures += 1;
      console.warn(`[rpc-fail] ${pair.canonicalSlug}: ${error?.message ?? 'no data'}`);
      continue;
    }

    const root = data as CompareRoot;
    if (root.error) {
      rpcFailures += 1;
      console.warn(`[rpc-fail] ${pair.canonicalSlug}: ${root.error}`);
      continue;
    }

    const leftCount = Number(root.institution_a?.grant_count ?? 0);
    const rightCount = Number(root.institution_b?.grant_count ?? 0);

    if (leftCount < MIN_GRANTS_PER_SIDE || rightCount < MIN_GRANTS_PER_SIDE) {
      continue;
    }

    rpcEligible += 1;

    const filters = {
      source: 'enqueue-university-compare',
      compareSlug: pair.canonicalSlug,
      institutionA: {
        id: pair.institutionA.id,
        slug: pair.institutionA.slug,
        name: pair.institutionA.name,
        topRank: pair.institutionA.rank,
        activeGrantCount: leftCount
      },
      institutionB: {
        id: pair.institutionB.id,
        slug: pair.institutionB.slug,
        name: pair.institutionB.name,
        topRank: pair.institutionB.rank,
        activeGrantCount: rightCount
      },
      minGrantsPerInstitution: MIN_GRANTS_PER_SIDE
    } satisfies Json;

    if (dryRun) {
      console.log(
        `[dry-run] enqueue ${pathKey} (${pair.institutionA.slug}:${leftCount} vs ${pair.institutionB.slug}:${rightCount})`
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
      `[queued] ${pathKey} (${pair.institutionA.slug}:${leftCount} vs ${pair.institutionB.slug}:${rightCount})`
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

  if (limit != null && inserted < limit) {
    console.log(
      `Stopped after exhausting eligible pairs before reaching --limit=${limit}.`
    );
  }
}

if (isCliMain()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
