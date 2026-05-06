/**
 * Stage 1 — read-only cross-country SEO preview (no writes, no route/sitemap changes).
 *
 *   npm run seo:cross-country-preview
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (same as public listing reads).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { createClient } from '@supabase/supabase-js';

import { scholarshipCountrySlugFromCode } from '../app/scholarships/scholarshipCountrySeo';
import { countryLabelFromCode } from '../lib/scholarships/countryEligibility/countries';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');

const PAGE_SIZE = 1000;
const MIN_PAIR_COUNT = 5;
const MAX_SAMPLES = 9;

/** H1 / meta title short forms (applicant side). */
const APPLICANT_H1_ADJECTIVE: Record<string, string> = {
  GB: 'UK',
  US: 'American',
  CA: 'Canadian',
  IN: 'Indian',
  MX: 'Mexican',
  PH: 'Filipino',
  NG: 'Nigerian',
  GH: 'Ghanaian',
  KE: 'Kenyan',
  PK: 'Pakistani',
  BD: 'Bangladeshi'
};

/** Study-in short phrase fragment after "Study in …" */
function hostShortName(hostCode: string): string {
  const c = hostCode.toUpperCase();
  switch (c) {
    case 'US':
      return 'the USA';
    case 'GB':
      return 'the UK';
    case 'NL':
      return 'the Netherlands';
    case 'PH':
      return 'the Philippines';
    default:
      return countryLabelFromCode(c);
  }
}

function applicantSlug(code: string): string {
  const fromSeo = scholarshipCountrySlugFromCode(code);
  if (fromSeo) return fromSeo;
  const label = countryLabelFromCode(code);
  return slugifyLabel(label);
}

function slugifyLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isoCodes(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  for (const raw of arr) {
    const code = String(raw).trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(code)) out.push(code);
  }
  return [...new Set(out)];
}

type Tier = 'low_count_noindex' | 'candidate_after_QA' | 'priority_candidate';

function tierForCount(n: number): Tier {
  if (n >= 50) return 'priority_candidate';
  if (n >= 20) return 'candidate_after_QA';
  return 'low_count_noindex';
}

type PairAgg = {
  applicantCode: string;
  hostCode: string;
  count: number;
  unspecifiedHits: number;
  samples: Array<{ id: string; title: string; slug: string | null }>;
};

function buildCopy(applicantCode: string, hostCode: string) {
  const applicantCountry = countryLabelFromCode(applicantCode);
  const hostCountry = countryLabelFromCode(hostCode);
  const adj = APPLICANT_H1_ADJECTIVE[applicantCode.toUpperCase()];
  const hostShort = hostShortName(hostCode);

  const usePreferred = Boolean(adj);

  const h1 = usePreferred
    ? `Scholarships for ${adj} Students to Study in ${hostShort}`
    : `Scholarships for Students from ${applicantCountry} to Study in ${hostCountry}`;

  const metaTitle = usePreferred
    ? `${adj} Students: Scholarships to Study in ${hostShort} | ScholarshipTop`
    : `Students from ${applicantCountry}: Scholarships to Study in ${hostCountry} | ScholarshipTop`;

  const metaDescription = `Find scholarships for students from ${applicantCountry} who want to study in ${hostCountry}. Compare deadlines, award amounts, eligibility notes, and requirements before applying.`;

  const intro = `Explore scholarships that list ${applicantCountry} as an eligible applicant country and ${hostCountry} as the study destination. Compare award amounts, deadlines, requirements, and eligibility notes before opening the official application page.`;

  const faqQuestions = [
    `Are there scholarships for students from ${applicantCountry} to study in ${hostCountry}?`,
    adj
      ? `Can ${adj} students apply for scholarships in ${hostCountry}?`
      : `Can students from ${applicantCountry} apply for scholarships in ${hostCountry}?`,
    'What should I compare before applying?',
    'Do I need to write an essay for these scholarships?',
    'How do I know if I’m eligible?'
  ];

  return {
    h1,
    metaTitle,
    metaDescription,
    intro,
    faqQuestions,
    applicantCountry,
    hostCountry,
    applicantAdjectivePreferred: adj ?? null,
    hostShortName: hostShort
  };
}

function csvEscape(s: string): string {
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function pairRecommendations(p: {
  tier: Tier;
  totalCount: number;
  hostCode: string;
  unspecifiedFraction: number;
}) {
  let robots = 'noindex,follow';
  let includeInSitemap = 'false_until_manual_approve';
  let allowedForAds: string;
  let recommendation: string;
  let duplicateRisk =
    'medium_intent_overlap_with_hub_filtered_urls_hub_queries_are_typically_noindex';
  let unspecifiedRisk: string;

  if (p.unspecifiedFraction >= 0.35) unspecifiedRisk = 'high_fraction_host_location_unspecified_flag';
  else if (p.unspecifiedFraction >= 0.15) unspecifiedRisk = 'medium_review_card_vs_filter_signals';
  else unspecifiedRisk = 'low_strict_pair_from_nonempty_host_codes';

  if (p.tier === 'low_count_noindex') {
    robots = 'noindex,follow';
    includeInSitemap = 'false_volume_below_20';
    allowedForAds = 'no';
    recommendation =
      'Thin volume (5–19). Optional future page; keep noindex and out of sitemap until stronger catalog depth.';
  } else if (p.tier === 'candidate_after_QA') {
    robots = 'noindex,follow_until_manual_QA_and_approve';
    includeInSitemap = 'false_until_manual_QA_and_approve';
    allowedForAds = 'no_unless_promoted_after_QA';
    recommendation =
      'Manual QA of first-page cards and eligibility/host labels; index+sitemap only after explicit approve.';
  } else {
    robots = 'noindex,follow_until_manual_approve';
    includeInSitemap = 'false_until_manual_approve';
    if (p.hostCode.toUpperCase() === 'DE') {
      allowedForAds = 'review_generic_DE_host_cluster';
      recommendation =
        'Priority volume (50+). Strong candidate after QA; Ads only after proving audience fit (many *→DE listings look similar).';
    } else if (['US', 'GB', 'CA', 'AU'].includes(p.hostCode.toUpperCase())) {
      allowedForAds = 'yes_after_QA';
      recommendation =
        'Priority volume (50+). Launch after QA; suitable for Google Ads after creative/LP review.';
    } else {
      allowedForAds = 'review_after_QA';
      recommendation =
        'Priority volume (50+). Launch after QA; Ads depend on host-market clarity and LP match.';
    }
  }

  duplicateRisk +=
    '_cross_country_path_not_implemented_yet_unique_when_launched';

  return {
    robots,
    includeInSitemap,
    allowedForAds,
    recommendation,
    duplicateRisk,
    unspecifiedRisk,
    germanyClusterRisk:
      p.hostCode.toUpperCase() === 'DE'
        ? 'high_many_similar_applicant_to_DE_pairs'
        : 'low_not_DE_host'
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    console.error(
      '[seo-cross-country-preview] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (e.g. via .env.local + npm script).'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const pairMap = new Map<string, PairAgg>();
  const anyApplicant = new Set<string>();
  const anyHost = new Set<string>();
  let rowsScanned = 0;

  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('scholarships_safe_listing')
      .select(
        'id, title, slug, applicant_country_codes, host_country_codes, host_program_location_unspecified'
      )
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('[seo-cross-country-preview] Supabase error:', error.message);
      process.exit(1);
    }
    const rows = data ?? [];
    if (rows.length === 0) break;
    rowsScanned += rows.length;

    for (const row of rows) {
      const apps = isoCodes(row.applicant_country_codes);
      const hosts = isoCodes(row.host_country_codes);
      for (const a of apps) anyApplicant.add(a);
      for (const h of hosts) anyHost.add(h);
      if (apps.length === 0 || hosts.length === 0) continue;

      const unspecified =
        row.host_program_location_unspecified === true ? 1 : 0;

      for (const a of apps) {
        for (const h of hosts) {
          const key = `${a}|${h}`;
          let agg = pairMap.get(key);
          if (!agg) {
            agg = {
              applicantCode: a,
              hostCode: h,
              count: 0,
              unspecifiedHits: 0,
              samples: []
            };
            pairMap.set(key, agg);
          }
          agg.count += 1;
          agg.unspecifiedHits += unspecified;
          if (agg.samples.length < MAX_SAMPLES && !agg.samples.some((s) => s.id === row.id)) {
            agg.samples.push({
              id: row.id,
              title: (row.title as string)?.trim() || '(no title)',
              slug: (row.slug as string | null) ?? null
            });
          }
        }
      }
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const allPairs = [...pairMap.values()].sort((a, b) => b.count - a.count);
  const nonzeroPairs = allPairs.length;
  const theoreticalCatalog = anyApplicant.size * anyHost.size;

  const reported = allPairs.filter((p) => p.count >= MIN_PAIR_COUNT);
  const gte5 = reported.length;
  const b5_19 = reported.filter((p) => p.count >= 5 && p.count <= 19).length;
  const b20_49 = reported.filter((p) => p.count >= 20 && p.count <= 49).length;
  const gte50 = reported.filter((p) => p.count >= 50).length;

  const enriched = reported.map((agg) => {
    const applicantSlugOut = applicantSlug(agg.applicantCode);
    const hostSlugOut = applicantSlug(agg.hostCode);
    const href = `/scholarships/for-students-from/${applicantSlugOut}/study-in/${hostSlugOut}`;
    const tier = tierForCount(agg.count);
    const unspecifiedFraction =
      agg.count > 0 ? agg.unspecifiedHits / agg.count : 0;
    const copy = buildCopy(agg.applicantCode, agg.hostCode);
    const rec = pairRecommendations({
      tier,
      totalCount: agg.count,
      hostCode: agg.hostCode,
      unspecifiedFraction
    });

    const recommendedStatus =
      tier === 'priority_candidate'
        ? 'priority_launch_after_QA'
        : tier === 'candidate_after_QA'
          ? 'manual_QA_required'
          : 'defer_low_volume';

    return {
      href,
      applicantCode: agg.applicantCode,
      applicantName: copy.applicantCountry,
      hostCode: agg.hostCode,
      hostName: copy.hostCountry,
      totalCount: agg.count,
      tier,
      recommendedStatus,
      robots: rec.robots,
      includeInSitemap: rec.includeInSitemap,
      allowedForAds: rec.allowedForAds,
      duplicateRisk: rec.duplicateRisk,
      unspecifiedRisk: rec.unspecifiedRisk,
      germanyClusterRisk: rec.germanyClusterRisk,
      recommendation: rec.recommendation,
      qaNotes: 'pending',
      unspecifiedFraction,
      sampleScholarships: agg.samples,
      ...copy
    };
  });

  const top20Seo = [...enriched]
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 20);

  const adsPool = enriched.filter(
    (r) =>
      r.tier === 'priority_candidate' &&
      ['US', 'GB', 'CA', 'AU'].includes(r.hostCode.toUpperCase())
  );
  const top10Ads = [...adsPool].sort((a, b) => b.totalCount - a.totalCount).slice(0, 10);

  const usaHostPairs = enriched.filter((r) => r.hostCode.toUpperCase() === 'US').length;
  const deHostPairs = enriched.filter((r) => r.hostCode.toUpperCase() === 'DE').length;

  const firstBatch = enriched
    .filter(
      (r) =>
        r.tier === 'priority_candidate' &&
        ['US'].includes(r.hostCode.toUpperCase()) &&
        ['GB', 'CA', 'IN', 'MX', 'PH', 'NG'].includes(r.applicantCode.toUpperCase())
    )
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 15);

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  const jsonPath = path.join(DOCS_DIR, 'seo-cross-country-preview.json');
  const csvPath = path.join(DOCS_DIR, 'seo-cross-country-preview.csv');
  const mdPath = path.join(DOCS_DIR, 'seo-cross-country-report.md');

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    minPairCount: MIN_PAIR_COUNT,
    summary: {
      rowsScanned,
      uniquePairsNonzero: nonzeroPairs,
      theoreticalApplicantTimesHostCatalog: theoreticalCatalog,
      pairsIncludedInReportGte5: gte5,
      pairs5to19: b5_19,
      pairs20to49: b20_49,
      pairs50plus: gte50,
      usaHostPairsGte5: usaHostPairs,
      germanyHostPairsGte5: deHostPairs
    },
    pairs: enriched
  };

  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2), 'utf8');

  const csvHeader = [
    'href',
    'applicantCode',
    'applicantName',
    'hostCode',
    'hostName',
    'totalCount',
    'tier',
    'recommendedStatus',
    'robots',
    'includeInSitemap',
    'allowedForAds',
    'duplicateRisk',
    'unspecifiedRisk',
    'recommendation',
    'qaNotes'
  ];

  const csvLines = [
    csvHeader.join(','),
    ...enriched.map((r) =>
      [
        r.href,
        r.applicantCode,
        r.applicantName,
        r.hostCode,
        r.hostName,
        String(r.totalCount),
        r.tier,
        r.recommendedStatus,
        r.robots,
        r.includeInSitemap,
        r.allowedForAds,
        r.duplicateRisk,
        r.unspecifiedRisk,
        r.recommendation,
        r.qaNotes
      ]
        .map((c) => csvEscape(String(c)))
        .join(',')
    )
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

  const md = `# Cross-country SEO preview (Stage 1)

Read-only aggregate from \`scholarships_safe_listing\` (active rows). No production routes or sitemap changes.

**Generated:** ${jsonPayload.generatedAt}

## Summary counts

| Metric | Value |
|--------|------:|
| Scholarship rows scanned | ${rowsScanned} |
| Unique applicant×host pairs (count ≥ 1) | ${nonzeroPairs} |
| Theoretical catalog grid (unique applicants × unique hosts seen anywhere) | ${theoreticalCatalog} |
| **Pairs in this report (count ≥ ${MIN_PAIR_COUNT})** | **${gte5}** |
| Pairs 5–19 | ${b5_19} |
| Pairs 20–49 | ${b20_49} |
| Pairs 50+ | ${gte50} |
| Pairs ≥ ${MIN_PAIR_COUNT} with host **US** | ${usaHostPairs} |
| Pairs ≥ ${MIN_PAIR_COUNT} with host **DE** (Germany cluster) | ${deHostPairs} |

## Cluster warnings

### Germany host cluster

Many distinct applicant countries share very similar **study-in-Germany** inventory (DAAD-style breadth). Treat **DE** host URLs as a **quality/relevance review** batch before Ads or mass indexing — not because counts are low, but because **templates and SERP differentiation** get harder.

### USA study destination cluster

Host **US** pairs are the natural **English-language acquisition** set. Expect the strongest **SEO + Ads** overlap here; still require manual QA so cards reinforce **Eligible + Study in** signals.

## Top 20 SEO candidates (by totalCount, among pairs ≥ ${MIN_PAIR_COUNT})

| # | Count | URL | Applicant | Host | Tier |
|---|------:|-----|-----------|------|------|
${top20Seo
  .map(
    (r, i) =>
      `| ${i + 1} | ${r.totalCount} | \`${r.href}\` | ${r.applicantName} | ${r.hostName} | ${r.tier} |`
  )
  .join('\n')}

## Top 10 Google Ads candidates

Priority tier, host in **US / GB / CA / AU**, sorted by count.

| # | Count | URL | Notes |
|---|------:|-----|-------|
${top10Ads
  .map(
    (r, i) =>
      `| ${i + 1} | ${r.totalCount} | \`${r.href}\` | ${r.allowedForAds} |`
  )
  .join('\n')}

## Recommended first batch (heuristic)

High host US + priority tier + major applicant markets (GB, CA, IN, MX, PH, NG):

${firstBatch.length ? firstBatch.map((r) => `- \`${r.href}\` — ${r.totalCount} — ${r.h1}`).join('\n') : '- _(none matched heuristic)_'}

## Recommended noindex / skip groups

- **Skip entirely (not in CSV/JSON pair list):** pairs with count **< ${MIN_PAIR_COUNT}** (${nonzeroPairs - gte5} pairs exist below threshold — not exported).
- **5–19:** \`low_count_noindex\` — keep **noindex**, **not in sitemap** until catalog depth improves.
- **20–49:** \`candidate_after_QA\` — **manual QA** then optional index + sitemap **only after approve**.
- **50+:** \`priority_candidate\` — still **noindex in preview**; production index/sitemap **only after approve**.

## Artifacts

- \`docs/seo-cross-country-preview.json\` — full rows + copy + samples  
- \`docs/seo-cross-country-preview.csv\` — summary columns for spreadsheets  
- This report — \`docs/seo-cross-country-report.md\`

## QA notes column

All rows default \`qaNotes=pending\` in CSV/JSON. Fill after manual review.
`;

  fs.writeFileSync(mdPath, md, 'utf8');

  console.log('');
  console.log('[seo-cross-country-preview] Done.');
  console.log(`  Rows scanned:              ${rowsScanned}`);
  console.log(`  Unique pairs (count ≥ 1):   ${nonzeroPairs}`);
  console.log(`  Pairs in report (≥ ${MIN_PAIR_COUNT}):     ${gte5}`);
  console.log(`    5–19 (low_count_noindex): ${b5_19}`);
  console.log(`    20–49 (candidate_after_QA): ${b20_49}`);
  console.log(`    50+ (priority_candidate):   ${gte50}`);
  console.log(`  Priority candidates (50+): ${gte50} pairs`);
  console.log(`  Ads candidate pool (50+, host US/GB/CA/AU): ${adsPool.length} pairs (top 10 in report)`);
  console.log('');
  console.log('  Files written:');
  console.log(`    ${jsonPath}`);
  console.log(`    ${csvPath}`);
  console.log(`    ${mdPath}`);
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
