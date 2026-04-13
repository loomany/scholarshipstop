/**
 * Find scholarships whose title/slug might match legacy WP URLs (Vanier, CBN, Newcastle).
 *
 * npx dotenv -e .env.local -- npx tsx scripts/find-legacy-slug-candidates.ts
 */
import { createClient } from '@supabase/supabase-js';

type Row = {
  slug: string | null;
  title: string | null;
  is_active: boolean | null;
};

const TERMS = [
  'vanier',
  'canada graduate',
  'central bank',
  'cbn',
  'nigeria',
  'newcastle',
  'newcastle university'
];

async function search(
  client: ReturnType<typeof createClient>,
  term: string
): Promise<Row[]> {
  const p = `%${term}%`;
  const sel = 'slug, title, is_active';
  const [a, b] = await Promise.all([
    client.from('scholarships').select(sel).ilike('title', p).limit(20),
    client.from('scholarships').select(sel).ilike('slug', p).limit(20)
  ]);
  if (a.error) throw new Error(a.error.message);
  if (b.error) throw new Error(b.error.message);
  const map = new Map<string, Row>();
  for (const r of [...(a.data ?? []), ...(b.data ?? [])] as Row[]) {
    const k = `${r.slug ?? ''}|${r.title ?? ''}`;
    map.set(k, r);
  }
  return [...map.values()];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const seen = new Set<string>();
  for (const term of TERMS) {
    const rows = await search(admin, term);
    const withSlug = rows.filter((r) => r.slug?.trim());
    if (withSlug.length === 0) continue;
    console.log(`\n--- matches for "${term}" (${withSlug.length} rows with slug) ---`);
    for (const r of withSlug.slice(0, 12)) {
      const line = `active=${r.is_active} slug=${r.slug} | ${(r.title ?? '').slice(0, 80)}`;
      if (seen.has(line)) continue;
      seen.add(line);
      console.log(line);
    }
  }

  if (seen.size === 0) {
    console.log(
      '\nNo rows found: none of the search terms appear in title or slug (with non-empty slug).'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
