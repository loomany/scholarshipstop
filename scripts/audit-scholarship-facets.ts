/**
 * Analytics: top US states by active grant count (state_codes) and top field/tag themes.
 *
 *   dotenv -e .env.local -- npx tsx scripts/audit-scholarship-facets.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types_db';

type ScholarshipRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  'state_codes' | 'field_of_study' | 'tags'
>;

function loadEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return { url, key };
}

function normalizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function bucketFieldOrTag(raw: string): string | null {
  const t = normalizeKey(raw);
  if (!t) return null;
  if (/\bnursing\b|\brn\b|\bbsn\b/.test(t)) return 'Nursing / health';
  if (/\bart\b|fine arts|visual arts|music|theatre|theater|dance/.test(t))
    return 'Arts & humanities';
  if (
    /\bstem\b|engineering|computer science|cs\b|software|physics|chemistry|biology(?! lab)/i.test(
      t
    )
  ) {
    return 'STEM';
  }
  if (/business|mba|finance|accounting|economics/.test(t)) return 'Business';
  if (/education|teaching|teacher/.test(t)) return 'Education';
  return null;
}

async function main() {
  const { url, key } = loadEnv();
  const supabase = createClient<Database>(url, key);

  const pageSize = 1000;
  let from = 0;
  const stateCounts = new Map<string, number>();
  const bucketCounts = new Map<string, number>();

  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select('state_codes, field_of_study, tags')
      .eq('is_active', true)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as ScholarshipRow[];
    if (rows.length === 0) break;

    for (const row of rows) {
      const codes = row.state_codes;
      if (Array.isArray(codes)) {
        for (const c of codes) {
          const code = String(c).trim().toUpperCase();
          if (code.length === 2) {
            stateCounts.set(code, (stateCounts.get(code) ?? 0) + 1);
          }
        }
      }

      const fos = row.field_of_study;
      if (Array.isArray(fos)) {
        for (const f of fos) {
          const b = bucketFieldOrTag(String(f));
          if (b) bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
        }
      }

      const tags = row.tags;
      if (Array.isArray(tags)) {
        for (const t of tags) {
          const b = bucketFieldOrTag(String(t));
          if (b) bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
        }
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const topStates = [...stateCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topBuckets = [...bucketCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('=== Top 10 US states by active scholarship rows (state_codes) ===');
  for (const [code, n] of topStates) {
    console.log(`  ${code}\t${n}`);
  }

  console.log('\n=== Top 5 thematic buckets (field_of_study + tags, heuristic) ===');
  for (const [label, n] of topBuckets) {
    console.log(`  ${label}\t${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
