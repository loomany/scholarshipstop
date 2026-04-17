/**
 * Phase 4 — Enqueue programmatic hub URLs that have enough catalog matches but no queue/hub row.
 * Call after scholarship imports or from a daily cron.
 *
 *   dotenv -e .env.local -- npx tsx scripts/seo-enqueue-missing-hubs.ts --dry-run
 *   dotenv -e .env.local -- npx tsx scripts/seo-enqueue-missing-hubs.ts --execute
 */

import { createClient } from '@supabase/supabase-js';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import { isScholarshipUSA } from '../app/scholarships/scholarshipCategories';
import { buildDynamicEntryFromCanonicalPath } from '../lib/scholarships/seoScholarshipDynamicEntry';
import { countScholarshipsMatchingManifestEntry } from '../lib/scholarships/seoScholarshipListing';
import {
  PROGRAMMATIC_DEGREE_SEGMENTS,
  PROGRAMMATIC_SPECIALTY_SLUGS,
  buildCanonicalHubPath
} from '../lib/seo/programmaticSeoHubCombos';
import { listUsStateSeoSlugs } from '../lib/scholarships/seoScholarshipRouteTokens';
import type { Database, Json } from '../types_db';

const PAGE_SIZE = 1000;
const MIN_GRANTS = 3;

const SELECT =
  'id,state_codes,field_of_study,study_levels,title,seo_tags' as const;

type Row = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'state_codes'
  | 'field_of_study'
  | 'study_levels'
  | 'title'
  | 'seo_tags'
>;

function jsonStringArray(value: unknown): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
}

function rowToScholarship(row: Row): Scholarship {
  const codes = jsonStringArray(row.state_codes).map((c) =>
    String(c).trim().toUpperCase()
  );
  return {
    id: row.id,
    country: 'USA',
    title: row.title?.trim() || 'Untitled scholarship',
    deadline: '',
    description: '',
    eligibility: [],
    benefits: '',
    howToApply: [],
    fieldOfStudy: jsonStringArray(row.field_of_study),
    studyLevels: jsonStringArray(row.study_levels),
    stateCodes: codes,
    seoTags: row.seo_tags ?? undefined
  } as Scholarship;
}

function loadSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient<Database>(url, key);
}

async function fetchRows(supabase: ReturnType<typeof createClient<Database>>) {
  const out: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(SELECT)
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Row[];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

async function main() {
  const execute = process.argv.includes('--execute');
  const dryRun = !execute;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (execute && (!url || !serviceKey)) {
    throw new Error(
      '--execute requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  const supabase = execute
    ? createClient<Database>(url!, serviceKey!)
    : loadSupabase();

  const rows = await fetchRows(supabase);
  const scholarships = rows.map(rowToScholarship);
  const usa = scholarships.filter((s) => isScholarshipUSA(s.country));

  const { data: queued } = await supabase
    .from('seo_generation_queue')
    .select('canonical_path');
  const queuedSet = new Set(
    (queued ?? []).map((r) => r.canonical_path.trim().toLowerCase())
  );

  const { data: hubRows } = await supabase
    .from('seo_hub_content')
    .select('canonical_path, content_html');
  const hubReady = new Set(
    (hubRows ?? [])
      .filter((r) => Boolean(r.content_html?.trim()))
      .map((r) => r.canonical_path.trim().toLowerCase())
  );

  const toInsert: {
    canonical_path: string;
    grant_count: number;
    filters: Json;
    priority: number;
  }[] = [];

  const states = listUsStateSeoSlugs();
  for (const stateSlug of states) {
    for (const topic of PROGRAMMATIC_SPECIALTY_SLUGS) {
      for (const degreeSegment of PROGRAMMATIC_DEGREE_SEGMENTS) {
        const canonical_path =
          buildCanonicalHubPath({ stateSlug, topicSlug: topic, degreeSegment }) ??
          '';
        if (!canonical_path) continue;
        const entry = buildDynamicEntryFromCanonicalPath(canonical_path);
        if (!entry) continue;
        const grant_count = countScholarshipsMatchingManifestEntry(usa, entry);
        if (grant_count <= MIN_GRANTS) continue;
        const key = canonical_path.toLowerCase();
        if (queuedSet.has(key) || hubReady.has(key)) continue;
        toInsert.push({
          canonical_path: key,
          grant_count,
          priority: grant_count,
          filters: {
            stateSlug,
            topicSlug: topic,
            degreeSegment,
            grant_count
          } as unknown as Json
        });
      }
    }
  }

  toInsert.sort((a, b) => b.priority - a.priority);

  console.log(
    `Candidates (count>${MIN_GRANTS}, not in queue / no hub body): ${toInsert.length}\n`
  );

  if (dryRun) {
    for (const c of toInsert.slice(0, 40)) {
      console.log(`  [dry-run] enqueue ${c.canonical_path} (n=${c.grant_count})`);
    }
    if (toInsert.length > 40) console.log(`  … ${toInsert.length - 40} more`);
    console.log('\nRe-run with --execute to insert into seo_generation_queue.');
    return;
  }

  let inserted = 0;
  for (const row of toInsert) {
    const { error } = await supabase.from('seo_generation_queue').insert({
      canonical_path: row.canonical_path,
      filters: row.filters,
      priority: row.priority,
      grant_count: row.grant_count,
      status: 'pending'
    });
    if (error) {
      if (error.code === '23505') continue;
      console.warn(`insert ${row.canonical_path}:`, error.message);
      continue;
    }
    inserted++;
  }
  console.log(`Inserted ${inserted} pending rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
