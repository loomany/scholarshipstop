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
  const pattern = `%${term}%`;
  const sel = 'id, slug, title, is_active, is_indexable';
  const [{ data: byTitle, error: e1 }, { data: bySlug, error: e2 }] =
    await Promise.all([
      client.from('scholarships').select(sel).ilike('title', pattern).limit(15),
      client.from('scholarships').select(sel).ilike('slug', pattern).limit(15)
    ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  const map = new Map<string, Row>();
  for (const r of [...(byTitle ?? []), ...(bySlug ?? [])] as Row[]) {
    map.set(r.id, r);
  }
  return [...map.values()].slice(0, 15);
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

  const primary = admin ?? anonClient;
  const { count: totalRows, error: countErr } = await primary
    .from('scholarships')
    .select('*', { count: 'exact', head: true });
  console.log(
    `=== Table scholarships: total rows = ${totalRows ?? '?'}${
      countErr ? ` (${countErr.message})` : ''
    } ===\n`
  );

  console.log('=== Exact slug lookup (service role, if present) ===\n');
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
    const { data: anyActive } = await admin
      .from('scholarships')
      .select('slug, title, is_active')
      .eq('is_active', true)
      .not('slug', 'is', null)
      .limit(1)
      .maybeSingle();
    if (anyActive?.slug) {
      const viaAnon = await fetchBySlug(anonClient, anyActive.slug);
      console.log(
        `\n=== RLS check: random active row slug="${anyActive.slug}" ===`
      );
      console.log(
        viaAnon
          ? `✓ anon CAN read public scholarships (sample ok)`
          : `✗ anon CANNOT read — fix RLS for SELECT on scholarships`
      );
    }
  }

  if (admin) {
    const sanity = await searchLike(admin, 'scholarship');
    console.log(
      `\n=== Sanity: rows with "scholarship" in title or slug: ${sanity.length} (expect > 0) ===\n`
    );

    const canadaHint = await searchLike(admin, 'Canada');
    if (canadaHint.length > 0) {
      console.log(
        `=== Hint: ${canadaHint.length} rows mention "Canada" (sample — use real slug for aliases) ===`
      );
      for (const r of canadaHint.slice(0, 8)) {
        console.log(
          `  slug=${r.slug ?? '(null)'} active=${r.is_active} | ${r.title?.slice(0, 72)}`
        );
      }
      console.log('');
    }

    console.log('=== Fuzzy search (service role) for related slugs ===\n');
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
