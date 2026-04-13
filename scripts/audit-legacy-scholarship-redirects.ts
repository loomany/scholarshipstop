/**
 * Audit: do legacy redirect targets exist in Supabase, and are they publicly readable?
 *
 * Usage: npx dotenv -e .env.local -- npx tsx scripts/audit-legacy-scholarship-redirects.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Row = {
  id: string;
  slug: string | null;
  title: string | null;
  is_active: boolean | null;
  is_indexable: boolean | null;
};

const TARGET_SLUGS = [
  'vanier-canada-graduate-scholarships',
  'central-bank-of-nigeria-collaborative-programme-for-postgraduates-cbn-cpp',
  'sports-scholarships-for-international-students-at-newcastle-university-in-uk'
];

const SEARCH_TERMS = ['vanier', 'cbn', 'nigeria central', 'newcastle'];

async function fetchBySlug(
  client: SupabaseClient,
  slug: string
): Promise<Row | null> {
  const { data, error } = await client
    .from('scholarships')
    .select('id, slug, title, is_active, is_indexable')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Row | null;
}

async function searchLike(
  client: SupabaseClient,
  term: string
): Promise<Row[]> {
  const { data, error } = await client
    .from('scholarships')
    .select('id, slug, title, is_active, is_indexable')
    .or(`slug.ilike.%${term}%,title.ilike.%${term}%`)
    .limit(15);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anon) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const admin = service
    ? createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

  console.log('=== Exact slug lookup (service role, if present) ===\n');
  const primary = admin ?? anonClient;
  for (const slug of TARGET_SLUGS) {
    const row = await fetchBySlug(primary, slug);
    if (!row) {
      console.log(`— "${slug}": NOT FOUND`);
      continue;
    }
    console.log(
      `✓ "${slug}" → id=${row.id} active=${row.is_active} indexable=${row.is_indexable}\n  title: ${row.title?.slice(0, 90)}`
    );
  }

  console.log('\n=== Same slugs via ANON (what the app uses) ===\n');
  for (const slug of TARGET_SLUGS) {
    const row = await fetchBySlug(anonClient, slug);
    console.log(
      row
        ? `✓ anon sees "${slug}" (active=${row.is_active})`
        : `✗ anon sees NOTHING for "${slug}" (missing row or RLS blocks)`
    );
  }

  if (admin) {
    console.log('\n=== Fuzzy search (service role) for related slugs ===\n');
    for (const term of SEARCH_TERMS) {
      const rows = await searchLike(admin, term);
      if (rows.length === 0) {
        console.log(`— no rows for term "${term}"`);
        continue;
      }
      console.log(`\n-- "${term}" (${rows.length} sample) --`);
      for (const r of rows) {
        console.log(
          `  slug=${r.slug} active=${r.is_active} | ${r.title?.slice(0, 70)}`
        );
      }
    }
  } else {
    console.log('\n(Set SUPABASE_SERVICE_ROLE_KEY in .env.local for fuzzy search.)');
  }

  console.log(
    '\n=== Recommendations ===\n' +
      '- If service finds rows but anon does not: fix RLS policies for public read of active scholarships.\n' +
      '- If slug missing: add/update `scholarships.slug` or extend LEGACY_SLUG_ALIASES in lib/seo/legacyScholarshipSlugAliases.ts.\n' +
      '- If row exists but is_active=false: reactivate or accept 404 for legacy links.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
