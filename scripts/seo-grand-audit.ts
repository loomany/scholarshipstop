/**
 * Phase 1 — Grand Audit: discover route-compatible hub URLs and raw catalog cardinality.
 *
 *   dotenv -e .env.local -- npx tsx scripts/seo-grand-audit.ts
 *
 * Outputs:
 *   data/seo-grand-audit-report.json
 *   data/seo-grand-audit-report.csv
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

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
const OUT_DIR = resolve(process.cwd(), 'data');

const AUDIT_SELECT =
  'id,state_codes,field_of_study,study_levels,title,seo_tags' as const;

type AuditRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'state_codes'
  | 'field_of_study'
  | 'study_levels'
  | 'title'
  | 'seo_tags'
>;

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
}

function rowToScholarship(row: AuditRow): Scholarship {
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
    throw new Error(
      'Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon)'
    );
  }
  return createClient<Database>(url, key);
}

async function fetchAllActiveRows(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<AuditRow[]> {
  const out: AuditRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(AUDIT_SELECT)
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AuditRow[];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

function collectRawUniques(rows: AuditRow[]) {
  const states = new Set<string>();
  const fields = new Set<string>();
  const levels = new Set<string>();
  for (const r of rows) {
    for (const c of jsonStringArray(r.state_codes)) {
      states.add(String(c).trim().toUpperCase());
    }
    for (const f of jsonStringArray(r.field_of_study)) {
      fields.add(String(f).trim());
    }
    for (const L of jsonStringArray(r.study_levels)) {
      levels.add(String(L).trim());
    }
  }
  return {
    unique_state_codes: Array.from(states).sort(),
    unique_field_of_study: Array.from(fields).sort((a, b) => a.localeCompare(b)),
    unique_study_levels: Array.from(levels).sort((a, b) => a.localeCompare(b))
  };
}

async function main() {
  const supabase = loadSupabase();
  console.log('Loading active scholarships…');
  const rows = await fetchAllActiveRows(supabase);
  const scholarships = rows.map(rowToScholarship);
  const usa = scholarships.filter((s) => isScholarshipUSA(s.country));
  console.log(`Loaded ${rows.length} rows (${usa.length} USA rows for route counts).\n`);

  const raw = collectRawUniques(rows);

  const routeRows: {
    canonical_path: string;
    state_slug: string;
    topic_slug: string;
    degree_segment: string;
    active_grants_count: number;
  }[] = [];

  const states = listUsStateSeoSlugs();
  for (const stateSlug of states) {
    for (const topic of PROGRAMMATIC_SPECIALTY_SLUGS) {
      for (const degreeSegment of PROGRAMMATIC_DEGREE_SEGMENTS) {
        const canonical_path = buildCanonicalHubPath({
          stateSlug,
          topicSlug: topic,
          degreeSegment
        });
        if (!canonical_path) continue;
        const entry = buildDynamicEntryFromCanonicalPath(canonical_path);
        if (!entry) continue;
        const active_grants_count = countScholarshipsMatchingManifestEntry(
          usa,
          entry
        );
        routeRows.push({
          canonical_path,
          state_slug: stateSlug,
          topic_slug: topic,
          degree_segment: degreeSegment,
          active_grants_count
        });
      }
    }
  }

  routeRows.sort((a, b) => b.active_grants_count - a.active_grants_count);

  const withAny = routeRows.filter((r) => r.active_grants_count > 0);
  const withGt3 = routeRows.filter((r) => r.active_grants_count > 3);

  const fullCartesianPotential =
    raw.unique_state_codes.length *
    raw.unique_field_of_study.length *
    raw.unique_study_levels.length;

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      active_scholarships_scanned: rows.length,
      usa_scholarships_for_matching: usa.length,
      route_combinations_tested: routeRows.length,
      valid_urls_count_gt_0: withAny.length,
      valid_urls_count_gt_3: withGt3.length,
      raw_unique_state_codes: raw.unique_state_codes.length,
      raw_unique_field_of_study: raw.unique_field_of_study.length,
      raw_unique_study_levels: raw.unique_study_levels.length,
      naive_full_cartesian_of_raw_uniques: fullCartesianPotential
    },
    raw_uniques: raw,
    routes: routeRows
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = resolve(OUT_DIR, 'seo-grand-audit-report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const csvLines = [
    'canonical_path,state_slug,topic_slug,degree_segment,active_grants_count',
    ...routeRows.map(
      (r) =>
        `${r.canonical_path},${r.state_slug},${r.topic_slug},${r.degree_segment},${r.active_grants_count}`
    )
  ];
  writeFileSync(resolve(OUT_DIR, 'seo-grand-audit-report.csv'), csvLines.join('\n'), 'utf8');

  console.log('=== Summary ===\n');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nWrote ${jsonPath}`);
  console.log(`Wrote ${resolve(OUT_DIR, 'seo-grand-audit-report.csv')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
