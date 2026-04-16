/**
 * One-off / periodic: copy resolved catalog matches from `scholarship_links` into
 * `related_scholarships` when the latter is empty, using the same resolver as `/resources/[slug]`.
 * Keeps DB aligned for queries that only read `related_scholarships` (e.g. indexes, analytics).
 *
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-related-scholarships-from-links.ts --dry-run
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/backfill-related-scholarships-from-links.ts
 */
import { createClient } from '@supabase/supabase-js';

import {
  parseRelatedScholarshipsJson,
  resolveRelatedScholarshipsForContentPost
} from '../lib/content-hub/articleScholarshipMatching/parseRelatedScholarshipsJson';

import type { Database, Json } from '../types_db';

const dryRun = process.argv.includes('--dry-run');

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient<Database>(url, key);

  const { data: rows, error } = await supabase
    .from('content_posts')
    .select('id, slug, related_scholarships, scholarship_links')
    .eq('status', 'published');

  if (error) throw new Error(error.message);

  let updated = 0;
  let skipped = 0;

  for (const row of rows ?? []) {
    const slug = row.slug?.trim();
    if (!slug) {
      skipped++;
      continue;
    }

    const existing = parseRelatedScholarshipsJson(row.related_scholarships);
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const next = resolveRelatedScholarshipsForContentPost(
      row.related_scholarships,
      row.scholarship_links
    );
    if (next.length === 0) {
      skipped++;
      continue;
    }

    const payload = JSON.parse(JSON.stringify(next)) as Json;

    if (dryRun) {
      console.log(`[dry-run] would update ${slug} (${next.length} items)`);
      updated++;
      continue;
    }

    const { error: upErr } = await supabase
      .from('content_posts')
      .update({
        related_scholarships: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (upErr) {
      console.error('update failed', slug, upErr.message);
    } else {
      console.log('updated', slug, next.length);
      updated++;
    }
  }

  console.log(
    JSON.stringify(
      { dryRun, published_rows: rows?.length ?? 0, updated, skipped },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
