import { createClient } from '@supabase/supabase-js';

import { generateUniversityCompareWithOpenAi } from '../lib/seo/comparePageAi';
import {
  buildUniversityCompareSourceCandidates,
  parseCompareSources
} from '../lib/seo/compareSources';
import type { Database, Json } from '../types_db';

type Admin = ReturnType<typeof loadAdmin>;

function loadAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

function argFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0 && process.argv[exactIndex + 1]) {
    return process.argv[exactIndex + 1]!.trim();
  }
  const raw = process.argv.find((item) => item.startsWith(`--${name}=`));
  return raw ? raw.slice(name.length + 3).trim() : null;
}

function argNum(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function hasSources(raw: Json | null | undefined): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  return parseCompareSources((raw as Record<string, unknown>).sources).length > 0;
}

async function fetchTargetPages(admin: Admin, options: {
  slug?: string | null;
  limit: number;
  includeAlreadySourced: boolean;
}) {
  let query = admin
    .from('compare_pages')
    .select('id, slug, inst_a_id, inst_b_id, content_json, ai_verdict, status')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(options.limit);

  if (options.slug?.trim()) {
    query = query.eq('slug', options.slug.trim().toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  return options.includeAlreadySourced
    ? rows
    : rows.filter((row) => !hasSources(row.content_json));
}

async function fetchInstitutionPair(admin: Admin, ids: string[]) {
  const { data, error } = await admin
    .from('institutions')
    .select('id, name, slug, website_url')
    .in('id', ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function refreshSourcesForPage(admin: Admin, row: {
  id: string;
  slug: string;
  inst_a_id: string;
  inst_b_id: string;
  content_json: Json | null;
}) {
  const insts = await fetchInstitutionPair(admin, [row.inst_a_id, row.inst_b_id]);
  if (insts.length < 2) {
    throw new Error(`Institutions missing for compare page ${row.slug}`);
  }

  const byId = new Map(insts.map((item) => [item.id, item] as const));
  const instA = byId.get(row.inst_a_id);
  const instB = byId.get(row.inst_b_id);
  if (!instA || !instB) {
    throw new Error(`Institution pair mismatch for compare page ${row.slug}`);
  }

  const sourceCandidates = buildUniversityCompareSourceCandidates({
    instAName: instA.name,
    instAWebsiteUrl: instA.website_url,
    instBName: instB.name,
    instBWebsiteUrl: instB.website_url
  });

  const { data: rpcData, error: rpcErr } = await admin.rpc('get_comparison_data', {
    p_inst_a: instA.id,
    p_inst_b: instB.id
  });
  if (rpcErr || !rpcData) {
    throw new Error(rpcErr?.message ?? `Missing comparison data for ${row.slug}`);
  }

  const generated = await generateUniversityCompareWithOpenAi({
    factsJson: JSON.stringify(rpcData),
    year: new Date().getFullYear(),
    sourceCandidates
  });
  if (!generated) {
    throw new Error(`OpenAI returned empty payload for ${row.slug}`);
  }

  const nextSources =
    generated.content_json.sources && generated.content_json.sources.length > 0
      ? generated.content_json.sources
      : sourceCandidates.slice(0, 5);

  const contentRecord =
    row.content_json && typeof row.content_json === 'object' && !Array.isArray(row.content_json)
      ? ({ ...(row.content_json as Record<string, unknown>) } satisfies Record<string, unknown>)
      : {};
  contentRecord.sources = nextSources as unknown as Json;

  const { error: updateErr } = await admin
    .from('compare_pages')
    .update({
      content_json: contentRecord as unknown as Json
    })
    .eq('id', row.id);

  if (updateErr) {
    throw new Error(updateErr.message);
  }
}

async function main() {
  const admin = loadAdmin();
  const dryRun = argFlag('dry-run');
  const slug = argValue('slug');
  const limit = argNum('limit', slug ? 1 : 50);
  const includeAlreadySourced = argFlag('force');

  const targets = await fetchTargetPages(admin, {
    slug,
    limit,
    includeAlreadySourced
  });

  console.log(
    `Found ${targets.length} university compare page(s) to ${
      dryRun ? 'inspect' : 'refresh'
    }.`
  );

  for (const row of targets) {
    if (dryRun) {
      console.log(`[dry-run] would refresh sources for ${row.slug}`);
      continue;
    }
    await refreshSourcesForPage(admin, row);
    console.log(`[ok] refreshed sources for ${row.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
