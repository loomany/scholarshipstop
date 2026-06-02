/**
 * Stage 4D.4 — Post-seed production DB verification (read-only).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { RESOURCE_PILOT_SLUGS } from '@/lib/i18n/resourcePilot/resourcePilotSlugs';
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
  if (!url?.includes('qlqlvhgosxhuibzhfsnh') || !anon || !service) {
    console.error('Refusing: production backup env required.');
    process.exit(1);
  }

  const admin = createClient<Database>(url, service, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const pub = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: rows, error } = await admin
    .from('content_translations')
    .select(
      'source_type, locale, status, quality_score, machine_model, translated_slug, source_id'
    )
    .eq('source_type', 'resource_article');
  if (error) throw error;

  const list = rows ?? [];
  const es = list.filter((r) => r.locale === 'es');
  const fr = list.filter((r) => r.locale === 'fr');
  const statuses = [...new Set(list.map((r) => r.status))];
  const models = [...new Set(list.map((r) => String(r.machine_model ?? '')))];
  const minQ = Math.min(...list.map((r) => Number(r.quality_score ?? 0)));
  const nonPublished = list.filter((r) => r.status !== 'published');

  const ids = [...new Set(list.map((r) => String(r.source_id)))];
  const { data: posts } = await admin
    .from('content_posts')
    .select('id, slug')
    .in('id', ids);
  const slugs = new Set((posts ?? []).map((p) => String(p.slug ?? '').toLowerCase()));
  const missingSlugs = RESOURCE_PILOT_SLUGS.filter((s) => !slugs.has(s));

  const { count: catCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_category');

  const { count: anonNonPub } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'published');

  const { count: anonResCount } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'resource_article')
    .eq('status', 'published');

  const { data: allTypes } = await admin.from('content_translations').select('source_type');
  const distinctTypes = [...new Set((allTypes ?? []).map((r) => r.source_type))].sort();

  console.log(
    JSON.stringify(
      {
        resourceArticleTotal: list.length,
        esCount: es.length,
        frCount: fr.length,
        statuses,
        machineModels: models,
        minQualityScore: minQ,
        nonPublishedCount: nonPublished.length,
        scholarshipCategoryCount: catCount,
        distinctSourceTypes: distinctTypes,
        pilotSlugsMissingOnPosts: missingSlugs,
        anonPublishedResourceVisible: anonResCount,
        anonNonPublishedVisible: anonNonPub,
        rlsPublishedOnlyPass: anonNonPub === 0
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
