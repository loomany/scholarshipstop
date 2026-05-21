/**
 * Stage 4C.3 — Verify production seed counts (service role, read-only).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

function loadEnv(): { url: string; key: string } {
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
  const env: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    env[t.slice(0, eq).trim()] = v;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return { url, key };
}

async function main() {
  const { url, key } = loadEnv();
  const admin = createClient<Database>(url, key);
  const { data, error, count } = await admin
    .from('content_translations')
    .select('source_type, source_id, locale, status, quality_score', { count: 'exact' });
  if (error) throw error;
  const rows = data ?? [];
  const es = rows.filter((r) => r.locale === 'es').length;
  const fr = rows.filter((r) => r.locale === 'fr').length;
  const types = [...new Set(rows.map((r) => r.source_type))];
  const excluded = rows.filter((r) =>
    ['hobbies', 'miscellaneous'].includes(String(r.source_id))
  );
  console.log(
    JSON.stringify(
      {
        total: count ?? rows.length,
        es,
        fr,
        sourceTypes: types,
        excludedCount: excluded.length,
        minQuality: Math.min(...rows.map((r) => r.quality_score ?? 0)),
        allPublished: rows.every((r) => r.status === 'published')
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
