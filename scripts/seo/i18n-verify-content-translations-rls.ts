/**
 * RLS verification for content_translations (local/staging only).
 * Usage:
 *   I18N_PILOT_ALLOW_DB_WRITES=1 npx tsx scripts/seo/i18n-verify-content-translations-rls.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

function loadEnv(): { url: string; anon: string; service: string } {
  const fromFile: Record<string, string> = {};
  const envPath = join(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      fromFile[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* optional */
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromFile.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? fromFile.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fromFile.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error('Missing Supabase env vars');
  if (url.includes('qlqlvhgosxhuibzhfsnh') && process.env.I18N_PILOT_ALLOW_PRODUCTION !== '1') {
    throw new Error(
      'Refusing RLS test on production-linked project. Use local Supabase or set I18N_PILOT_ALLOW_PRODUCTION=1 with explicit approval.'
    );
  }
  return { url, anon, service };
}

async function main() {
  if (process.env.I18N_PILOT_ALLOW_DB_WRITES !== '1') {
    console.error('Set I18N_PILOT_ALLOW_DB_WRITES=1');
    process.exit(1);
  }
  const { url, anon, service } = loadEnv();
  const admin = createClient<Database>(url, service);
  const pub = createClient<Database>(url, anon);

  const testId = 'rls-verify-category-test';
  const rows = [
    { locale: 'es', status: 'published' },
    { locale: 'fr', status: 'draft_machine' },
    { locale: 'es', status: 'review_required', suffix: '-review' },
    { locale: 'fr', status: 'blocked', suffix: '-blocked' }
  ] as const;

  for (const row of rows) {
    const sourceId = `${testId}${'suffix' in row ? row.suffix : ''}`;
    await admin.from('content_translations').upsert({
      source_type: 'scholarship_category',
      source_id: sourceId,
      locale: row.locale,
      status: row.status,
      translated_title: 'RLS test',
      quality_score: row.status === 'published' ? 90 : 50
    });
  }

  const { data: pubRows } = await pub
    .from('content_translations')
    .select('source_id, status')
    .like('source_id', `${testId}%`);

  const visible = pubRows ?? [];
  const onlyPublished =
    visible.length === 1 &&
    visible[0]?.status === 'published' &&
    visible[0]?.source_id === testId;

  await admin.from('content_translations').delete().like('source_id', `${testId}%`);

  console.log(
    JSON.stringify(
      {
        anonVisibleCount: visible.length,
        anonVisibleStatuses: visible.map((r) => r.status),
        rlsPass: onlyPublished
      },
      null,
      2
    )
  );
  process.exit(onlyPublished ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
