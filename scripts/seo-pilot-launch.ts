/**
 * Pilot SEO hubs: list State × Specialty combos with count > 3, generate OpenAI for top 5 only.
 *
 *   dotenv -e .env.local -- npx tsx scripts/seo-pilot-launch.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (for upsert),
 * OPENAI_API_KEY for the 5 generations.
 *
 * Note: does not import lib/scholarships/supabase.ts (avoids server-only in plain Node).
 */

import { createClient } from '@supabase/supabase-js';

import type { Scholarship } from '../app/scholarships/scholarshipsData';
import {
  LONG_TAIL_LINK_LABELS,
  longTailBaseFilter,
  type LongTailSlug
} from '../app/scholarships/scholarshipLongTailPresets';
import { isScholarshipUSA } from '../app/scholarships/scholarshipCategories';
import { scholarshipsInTab } from '../app/scholarships/scholarshipTabs';
import {
  SEO_ROUTE_STATE_SLUG_TO_CODE,
  SEO_ROUTE_STATE_SLUG_TO_LABEL
} from '../lib/scholarships/seoTags/routeSegmentMaps';
import { listUsStateSeoSlugs } from '../lib/scholarships/seoScholarshipRouteTokens';
import { generateSeoHubWithOpenAi } from '../lib/seo/seoHubContentAi';
import type { Database, Json } from '../types_db';

const PAGE_SIZE = 1000;

const PILOT_SELECT =
  'id,state_codes,field_of_study,study_levels,title,description,summary_short,who_can_apply,eligibility_text,institutions_text' as const;

/** Long-tail slugs that represent “specialty” hubs paired with a state. */
const SPECIALTY_TOPIC_SLUGS = [
  'engineering',
  'computer-science',
  'nursing',
  'arts'
] as const satisfies readonly LongTailSlug[];

type PilotRow = Pick<
  Database['public']['Tables']['scholarships']['Row'],
  | 'id'
  | 'state_codes'
  | 'field_of_study'
  | 'study_levels'
  | 'title'
  | 'description'
  | 'summary_short'
  | 'who_can_apply'
  | 'eligibility_text'
  | 'institutions_text'
>;

type Combo = {
  stateSlug: string;
  stateLabel: string;
  topicSlug: LongTailSlug;
  topicLabel: string;
  canonicalPath: string;
  count: number;
};

const OSC = '\u001b]';
const ST = '\u001b\\';

function terminalLink(url: string, text: string): string {
  return `${OSC}8;;${url}${ST}${text}${OSC}8;;${ST}`;
}

function jsonStringArray(value: Json | null | undefined): string[] {
  if (!value || !Array.isArray(value)) return [];
  return value.filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
}

/** Enough fields for longTailBaseFilter (engineering / nursing / …). */
function rowToScholarship(row: PilotRow): Scholarship {
  const codes = jsonStringArray(row.state_codes).map((c) =>
    String(c).trim().toUpperCase()
  );
  return {
    id: row.id,
    country: 'USA',
    title: row.title?.trim() || 'Untitled scholarship',
    deadline: '',
    description: row.description?.trim() ?? '',
    eligibility: [],
    benefits: '',
    howToApply: [],
    summaryShort: row.summary_short?.trim(),
    whoCanApplyText: row.who_can_apply?.trim(),
    eligibilityText: row.eligibility_text?.trim(),
    institutionsText: row.institutions_text?.trim(),
    fieldOfStudy: jsonStringArray(row.field_of_study),
    studyLevels: jsonStringArray(row.study_levels),
    stateCodes: codes
  } as Scholarship;
}

function loadSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      'Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon for fetch only)'
    );
  }
  return createClient<Database>(url, key);
}

function loadServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

async function fetchPilotRows(
  supabase: ReturnType<typeof createClient<Database>>
): Promise<PilotRow[]> {
  const out: PilotRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships')
      .select(PILOT_SELECT)
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as PilotRow[];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

function buildCombos(scholarships: Scholarship[]): Combo[] {
  const tabSets = {
    saved: [] as string[],
    ignored: [] as string[],
    started: [] as string[],
    submitted: [] as string[]
  };
  const usaAll = scholarships.filter((s) => isScholarshipUSA(s.country));
  const matches = scholarshipsInTab(usaAll, 'matches', tabSets);

  const combos: Combo[] = [];
  const stateSlugs = listUsStateSeoSlugs();

  for (const stateSlug of stateSlugs) {
    const stateLabel =
      SEO_ROUTE_STATE_SLUG_TO_LABEL[stateSlug] ?? stateSlug;
    const code = SEO_ROUTE_STATE_SLUG_TO_CODE[stateSlug]?.toUpperCase();
    if (!code) continue;

    for (const topicSlug of SPECIALTY_TOPIC_SLUGS) {
      const fn = longTailBaseFilter(topicSlug);
      if (!fn) continue;
      const count = matches.filter((s) => {
        const codes = (s.stateCodes ?? []).map((c) =>
          String(c).trim().toUpperCase()
        );
        if (!codes.includes(code)) return false;
        return fn(s);
      }).length;

      if (count <= 3) continue;

      combos.push({
        stateSlug,
        stateLabel,
        topicSlug,
        topicLabel: LONG_TAIL_LINK_LABELS[topicSlug],
        canonicalPath: `${stateSlug}/${topicSlug}`,
        count
      });
    }
  }

  combos.sort((a, b) => b.count - a.count);
  return combos;
}

async function upsertSeoHub(
  admin: ReturnType<typeof createClient<Database>>,
  canonicalPath: string,
  payload: {
    title: string;
    content_html: string;
    cost_of_living: Record<string, unknown>;
  }
) {
  const pathKey = canonicalPath.trim().replace(/^\/+/, '').toLowerCase();
  const row: Database['public']['Tables']['seo_hub_content']['Insert'] = {
    canonical_path: pathKey,
    title: payload.title,
    content_html: payload.content_html,
    cost_of_living_json: payload.cost_of_living as Json
  };
  const { error } = await admin
    .from('seo_hub_content')
    .upsert(row, { onConflict: 'canonical_path' });
  if (error) throw new Error(error.message);
}

async function main() {
  const supabase = loadSupabase();
  console.log('Loading active scholarships (pilot columns)…');
  const rows = await fetchPilotRows(supabase);
  const scholarships = rows.map(rowToScholarship);
  console.log(`Loaded ${scholarships.length} rows.\n`);

  const combos = buildCombos(scholarships);

  console.log(
    '=== State × Specialty combos with count > 3 (sorted by count desc) ===\n'
  );
  for (const c of combos) {
    console.log(
      `  ${c.count}\t${c.stateLabel}\t+\t${c.topicLabel}\t→\t/scholarships/${c.canonicalPath}`
    );
  }
  console.log(`\nTotal combos: ${combos.length}\n`);

  const top5 = combos.slice(0, 5);
  const year = new Date().getFullYear();
  const base = 'http://localhost:3000';

  const admin = loadServiceSupabase();
  if (!admin) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY missing — cannot upsert seo_hub_content.\n'
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn('OPENAI_API_KEY missing — skipping pilot generation.\n');
  }

  console.log('=== Pilot generation (top 5 only; rest dry-run) ===\n');

  for (let i = 0; i < combos.length; i++) {
    const c = combos[i]!;
    const inPilot = i < 5;

    if (!inPilot) {
      console.log(
        `[DRY RUN] skip /scholarships/${c.canonicalPath} (count=${c.count})`
      );
      continue;
    }

    if (!process.env.OPENAI_API_KEY?.trim() || !admin) {
      console.log(
        `[SKIP] would generate /scholarships/${c.canonicalPath} (missing OPENAI or service role)`
      );
      continue;
    }

    console.log(
      `[GENERATE] /scholarships/${c.canonicalPath} (count=${c.count})…`
    );
    const generated = await generateSeoHubWithOpenAi({
      stateName: c.stateLabel,
      topicLabel: c.topicLabel,
      year
    });
    if (!generated) {
      console.error(`  OpenAI failed for ${c.canonicalPath}`);
      continue;
    }
    await upsertSeoHub(admin, c.canonicalPath, {
      title: generated.title,
      content_html: generated.content_html,
      cost_of_living: generated.cost_of_living as Record<string, unknown>
    });
    console.log(`  Saved seo_hub_content for "${c.canonicalPath}"`);
  }

  console.log('\n=== Local preview links (top 5 pilot) ===\n');
  for (const c of top5) {
    const url = `${base}/scholarships/${c.canonicalPath}`;
    console.log(terminalLink(url, url));
    console.log(`   ${url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
