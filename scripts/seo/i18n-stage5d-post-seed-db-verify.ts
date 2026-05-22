/**
 * Stage 5D-2 — Post-seed production DB verification (read-only).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { PROVIDER_PILOT_SLUGS } from '@/lib/i18n/providerPilot/providerPilotSlugs';
import type { Database } from '@/types_db';

const MACHINE_MODEL = 'stage5d-provider-manual-pilot';

function loadEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, eq).trim()] = v;
  }
  return out;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !service || !anon) {
    console.error('Missing Supabase env');
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
    .select('source_id, locale, status, quality_score, machine_model, translated_title')
    .eq('source_type', 'provider_profile');
  if (error) throw error;

  const list = rows ?? [];
  const es = list.filter((r) => r.locale === 'es');
  const fr = list.filter((r) => r.locale === 'fr');
  const pilotOnly = list.filter((r) => r.machine_model === MACHINE_MODEL);
  const extra = list.filter((r) => r.machine_model !== MACHINE_MODEL);
  const lowQ = list.filter((r) => Number(r.quality_score ?? 0) < 85);
  const nonPub = list.filter((r) => r.status !== 'published');

  const ids = [...new Set(list.map((r) => String(r.source_id)))];
  const { data: prov } = await admin.from('providers').select('id, slug').in('id', ids);
  const slugById = new Map((prov ?? []).map((p) => [String(p.id), String(p.slug)]));

  const { count: catCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'scholarship_category');

  const { count: resCount } = await admin
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'resource_article');

  const { count: anonPubProvider } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .eq('source_type', 'provider_profile')
    .eq('status', 'published');

  const { count: anonNonPub } = await pub
    .from('content_translations')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'published');

  const slugsFound = new Set(
    pilotOnly.map((r) => slugById.get(String(r.source_id))?.toLowerCase()).filter(Boolean)
  );
  const missingPilotSlugs = PROVIDER_PILOT_SLUGS.filter((s) => !slugsFound.has(s));

  console.log(
    JSON.stringify(
      {
        providerProfileTotal: list.length,
        pilotRowCount: pilotOnly.length,
        esCount: es.length,
        frCount: fr.length,
        nonPilotProviderRows: extra.length,
        nonPublishedCount: nonPub.length,
        belowQuality85: lowQ.length,
        scholarshipCategoryCount: catCount,
        resourceArticleCount: resCount,
        missingPilotSlugs,
        anonPublishedProviderVisible: anonPubProvider,
        anonNonPublishedVisible: anonNonPub,
        rlsPublishedOnlyPass: anonNonPub === 0,
        rows: pilotOnly.map((r) => ({
          locale: r.locale,
          slug: slugById.get(String(r.source_id)),
          status: r.status,
          quality_score: r.quality_score,
          title: r.translated_title
        }))
      },
      null,
      2
    )
  );

  const ok =
    pilotOnly.length === 6 &&
    es.length === 3 &&
    fr.length === 3 &&
    nonPub.length === 0 &&
    lowQ.length === 0 &&
    extra.length === 0 &&
    missingPilotSlugs.length === 0;

  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
