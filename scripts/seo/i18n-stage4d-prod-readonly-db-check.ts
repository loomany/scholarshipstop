/**
 * Stage 4D.2 — Read-only production content_translations inventory (no writes).
 * Usage: npx tsx scripts/seo/i18n-stage4d-prod-readonly-db-check.ts
 * Loads .env.local.prod-backup only.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types_db';

function loadProdBackupEnv(): Record<string, string> {
  const raw = readFileSync(join(process.cwd(), '.env.local.prod-backup'), 'utf8').replace(
    /^\uFEFF/,
    ''
  );
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return out;
}

async function main() {
  const env = loadProdBackupEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url?.includes('qlqlvhgosxhuibzhfsnh')) {
    console.error('Refusing: expected production project qlqlvhgosxhuibzhfsnh in backup env.');
    process.exit(1);
  }
  if (!anon || !service) {
    console.error('Missing anon or service key in .env.local.prod-backup');
    process.exit(1);
  }

  const admin = createClient<Database>(url, service, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const pub = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const sourceTypes = [
    'scholarship_category',
    'resource_article',
    'scholarship_detail',
    'provider',
    'essay',
    'compare'
  ] as const;

  const counts: Record<string, number> = {};
  for (const st of sourceTypes) {
    const { count, error } = await admin
      .from('content_translations')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', st);
    if (error) throw error;
    counts[st] = count ?? 0;
  }

  const { data: typeRows, error: typeErr } = await admin
    .from('content_translations')
    .select('source_type');
  if (typeErr) throw typeErr;
  const distinctTypes = [
    ...new Set((typeRows ?? []).map((r) => String(r.source_type)))
  ].sort();

  const { count: anonNonPublished, error: npErr } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'published');
  if (npErr) throw npErr;

  const { count: anonPublishedTotal, error: pubErr } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');
  if (pubErr) throw pubErr;

  const { data: draftSample, error: draftErr } = await admin
    .from('content_translations')
    .select('source_type, locale, status')
    .neq('status', 'published')
    .limit(5);
  if (draftErr) throw draftErr;

  const { data: draftAnonSample, error: draftAnonErr } = await pub
    .from('content_translations')
    .select('source_type, locale, status')
    .neq('status', 'published')
    .limit(5);
  if (draftAnonErr) throw draftAnonErr;

  console.log(
    JSON.stringify(
      {
        projectRef: 'qlqlvhgosxhuibzhfsnh',
        readOnly: true,
        countsBySourceType: counts,
        distinctSourceTypesInTable: distinctTypes,
        rlsAnonPublishedRowsVisible: anonPublishedTotal,
        rlsAnonNonPublishedRowsVisible: anonNonPublished,
        rlsPublishedOnlyPass: anonNonPublished === 0,
        draftRowsExistOnServer: (draftSample ?? []).length > 0,
        draftSampleAdmin: draftSample,
        draftSampleAnon: draftAnonSample
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
