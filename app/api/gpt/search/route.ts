import { NextResponse } from 'next/server';

import { scholarshipCountrySlugFromCode } from '@/app/scholarships/scholarshipCountrySeo';
import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';
import { getCanonical } from '@/lib/seo/canonical';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MIN_EXACT_BEFORE_FALLBACK = 2;

const SELECT_COLUMNS = [
  'title',
  'slug',
  'provider_name',
  'award_amount_text',
  'award_amount_numeric_sort',
  'currency',
  'deadline_text',
  'deadline_date',
  'summary_short',
  'summary_long',
  'ranking_score',
  'is_verified',
  'applicant_country_codes',
  'host_country_codes',
  'catalog_education_levels',
  'study_levels',
  'field_of_study'
].join(', ');

type MatchTier =
  | 'exact_match'
  | 'keyword_relaxed'
  | 'major_relaxed'
  | 'broad_recommendation';

type RelaxedFilter = 'keyword' | 'major';

type SearchInputs = {
  country: string | null;
  countryCode: string | null;
  major: string | null;
  level: string | null;
  keyword: string | null;
  limit: number;
};

type SearchTier = {
  tier: MatchTier;
  includeCountry: boolean;
  includeMajor: boolean;
  includeLevel: boolean;
  includeKeyword: boolean;
  relaxedFilters: RelaxedFilter[];
  reason: string;
};

type SafeScholarshipRow = {
  title: string | null;
  slug: string | null;
  provider_name: string | null;
  award_amount_text: string | null;
  award_amount_numeric_sort: number | null;
  currency: string | null;
  deadline_text: string | null;
  deadline_date: string | null;
  summary_short: string | null;
  summary_long: string | null;
  ranking_score: number | null;
  is_verified: boolean | null;
  applicant_country_codes: unknown;
  host_country_codes: unknown;
  catalog_education_levels: unknown;
  study_levels: unknown;
  field_of_study: unknown;
};

type GptScholarshipResult = {
  title: string;
  provider: string | null;
  deadline: string | null;
  amount_short: string | null;
  summary: string | null;
  url: string;
  canonical_url: string;
  match_tier: MatchTier;
  match_reason: string;
  relaxed_filters: RelaxedFilter[];
};

type SuggestedHub = {
  label: string;
  url: string;
};

type GptSearchResponse = {
  results: GptScholarshipResult[];
  count: number;
  total_exact: number;
  fallback_used: boolean;
  suggested_hubs: SuggestedHub[];
  filters: {
    country: string | null;
    country_code: string | null;
    major: string | null;
    level: string | null;
    keyword: string | null;
    limit: number;
  };
  notes: string[];
};

type ScoredCandidate = {
  row: SafeScholarshipRow;
  tier: SearchTier;
  score: number;
};

const LEVEL_SYNONYMS: Record<string, string[]> = {
  'high-school': ['high school', 'high_school', 'high-school'],
  'high-school-senior': [
    'high school senior',
    'high_school_senior',
    'high-school-senior',
    'senior'
  ],
  undergraduate: [
    'undergraduate',
    'bachelor',
    'bachelors',
    "bachelor's",
    'associate'
  ],
  graduate: ['graduate', 'grad', 'masters', "master's", 'master', 'mba'],
  phd: ['phd', 'ph.d.', 'doctoral', 'doctorate'],
  'community-college': ['community college', 'community_college'],
  'trade-school': ['trade school', 'trade_school', 'vocational']
};

const TIER_BASE_SCORE: Record<MatchTier, number> = {
  exact_match: 1000,
  keyword_relaxed: 800,
  major_relaxed: 650,
  broad_recommendation: 450
};

function jsonArrayContains(column: string, value: string): string {
  return `${column}.cs.${JSON.stringify([value])}`;
}

function sanitizeIlike(raw: string | null): string | null {
  const normalized = raw
    ?.replace(/[%_,(){}[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return normalized && normalized.length >= 2 ? normalized : null;
}

function readSingleParam(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value.slice(0, 120) : null;
}

function readLimit(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get('limit') ?? DEFAULT_LIMIT);
  if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)));
}

function bearerTokenFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function expectedBearerToken(): string | null {
  return (
    process.env.GPT_SEARCH_API_TOKEN?.trim() ||
    process.env.SCHOLARSHIPTOP_GPT_ACTION_TOKEN?.trim() ||
    null
  );
}

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json(
    { error: message },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer'
      }
    }
  );
}

function normalizeLoose(raw: string | null): string | null {
  const safe = sanitizeIlike(raw);
  return safe ? safe.toLowerCase() : null;
}

function levelTerms(raw: string | null): string[] {
  const safe = sanitizeIlike(raw);
  if (!safe) return [];
  const normalized = safe.toLowerCase().replace(/\s+/g, '-');
  return LEVEL_SYNONYMS[normalized] ?? [safe.toLowerCase()];
}

function unknownStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function textIncludes(value: string | null | undefined, needle: string | null): boolean {
  if (!value || !needle) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

function rowText(row: SafeScholarshipRow): string {
  return [row.title, row.provider_name, row.summary_short, row.summary_long]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function countryMatches(row: SafeScholarshipRow, countryCode: string | null): boolean {
  if (!countryCode) return false;
  const code = countryCode.toUpperCase();
  return (
    unknownStringArray(row.applicant_country_codes).some(
      (value) => value.toUpperCase() === code
    ) ||
    unknownStringArray(row.host_country_codes).some(
      (value) => value.toUpperCase() === code
    )
  );
}

function majorMatches(row: SafeScholarshipRow, major: string | null): boolean {
  const safe = normalizeLoose(major);
  if (!safe) return false;
  return (
    unknownStringArray(row.field_of_study).some((value) =>
      value.toLowerCase().includes(safe)
    ) || rowText(row).includes(safe)
  );
}

function levelMatches(row: SafeScholarshipRow, level: string | null): boolean {
  const terms = levelTerms(level);
  if (terms.length === 0) return false;
  const levelValues = [
    ...unknownStringArray(row.catalog_education_levels),
    ...unknownStringArray(row.study_levels)
  ].map((value) => value.toLowerCase());
  const text = rowText(row);
  return terms.some(
    (term) =>
      levelValues.some((value) => value.includes(term)) || text.includes(term)
  );
}

function keywordMatches(row: SafeScholarshipRow, keyword: string | null): boolean {
  const safe = normalizeLoose(keyword);
  if (!safe) return false;
  return rowText(row).includes(safe);
}

function applyCountryFilter(query: any, countryCode: string | null): any {
  if (!countryCode) return query;
  return query.or(
    [
      jsonArrayContains('applicant_country_codes', countryCode),
      jsonArrayContains('host_country_codes', countryCode)
    ].join(',')
  );
}

function applyMajorFilter(query: any, major: string | null): any {
  const safe = sanitizeIlike(major);
  if (!safe) return query;
  const lower = safe.toLowerCase();
  return query.or(
    [
      jsonArrayContains('field_of_study', lower),
      `title.ilike.%${safe}%`,
      `summary_short.ilike.%${safe}%`,
      `summary_long.ilike.%${safe}%`
    ].join(',')
  );
}

function applyLevelFilter(query: any, level: string | null): any {
  const terms = levelTerms(level);
  if (terms.length === 0) return query;

  const parts = terms.flatMap((term) => [
    jsonArrayContains('catalog_education_levels', term),
    jsonArrayContains('study_levels', term),
    `title.ilike.%${term}%`,
    `summary_short.ilike.%${term}%`
  ]);
  return query.or(parts.join(','));
}

function applyKeywordFilter(query: any, keyword: string | null): any {
  const safe = sanitizeIlike(keyword);
  if (!safe) return query;
  return query.or(
    [
      `title.ilike.%${safe}%`,
      `provider_name.ilike.%${safe}%`,
      `summary_short.ilike.%${safe}%`,
      `summary_long.ilike.%${safe}%`
    ].join(',')
  );
}

function amountShort(row: SafeScholarshipRow): string | null {
  const text = row.award_amount_text?.trim();
  if (text) return text;

  const amount = row.award_amount_numeric_sort;
  if (amount == null || !Number.isFinite(Number(amount))) return null;

  const currency = row.currency?.trim() || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(Number(amount));
  } catch {
    return `${currency} ${Math.round(Number(amount)).toLocaleString('en-US')}`;
  }
}

function scholarshipUrl(row: SafeScholarshipRow): string {
  const slug = row.slug?.trim();
  return getCanonical(`/scholarships/${encodeURIComponent(slug || '')}`);
}

function scoreCandidate(
  row: SafeScholarshipRow,
  tier: SearchTier,
  inputs: SearchInputs
): number {
  let score = TIER_BASE_SCORE[tier.tier];
  if (majorMatches(row, inputs.major)) score += 30;
  if (countryMatches(row, inputs.countryCode)) score += 25;
  if (levelMatches(row, inputs.level)) score += 20;
  if (keywordMatches(row, inputs.keyword)) score += 15;
  if (row.is_verified) score += 10;
  if (row.deadline_date) score += 5;
  if (Number.isFinite(Number(row.ranking_score))) {
    score += Math.min(100, Math.max(0, Number(row.ranking_score))) / 100;
  }
  return score;
}

function mapResult(candidate: ScoredCandidate): GptScholarshipResult | null {
  const slug = candidate.row.slug?.trim();
  const title = candidate.row.title?.trim();
  if (!slug || !title) return null;

  const canonicalUrl = scholarshipUrl(candidate.row);
  return {
    title,
    provider: candidate.row.provider_name?.trim() || null,
    deadline: candidate.row.deadline_text?.trim() || candidate.row.deadline_date || null,
    amount_short: amountShort(candidate.row),
    summary:
      candidate.row.summary_short?.trim() ||
      candidate.row.summary_long?.trim() ||
      null,
    url: canonicalUrl,
    canonical_url: canonicalUrl,
    match_tier: candidate.tier.tier,
    match_reason: candidate.tier.reason,
    relaxed_filters: candidate.tier.relaxedFilters
  };
}

function buildSearchTiers(inputs: SearchInputs): SearchTier[] {
  const hasKeyword = Boolean(sanitizeIlike(inputs.keyword));
  const hasMajor = Boolean(sanitizeIlike(inputs.major));

  return [
    {
      tier: 'exact_match',
      includeCountry: true,
      includeMajor: true,
      includeLevel: true,
      includeKeyword: true,
      relaxedFilters: [],
      reason: 'Matched country, level, major, and keyword when those filters were provided.'
    },
    ...(hasKeyword
      ? [
          {
            tier: 'keyword_relaxed' as const,
            includeCountry: true,
            includeMajor: true,
            includeLevel: true,
            includeKeyword: false,
            relaxedFilters: ['keyword' as const],
            reason:
              'Matched country, level, and major; keyword was relaxed to broaden results.'
          }
        ]
      : []),
    ...(hasMajor
      ? [
          {
            tier: 'major_relaxed' as const,
            includeCountry: true,
            includeMajor: false,
            includeLevel: true,
            includeKeyword: true,
            relaxedFilters: ['major' as const],
            reason:
              'Matched country, level, and keyword; major was relaxed because field labels can vary.'
          }
        ]
      : []),
    {
      tier: 'broad_recommendation',
      includeCountry: true,
      includeMajor: false,
      includeLevel: true,
      includeKeyword: false,
      relaxedFilters: ['keyword', 'major'],
      reason:
        'Broad recommendation matched country and level; keyword and major were relaxed to avoid empty results.'
    }
  ];
}

function applyTierFilters(query: any, tier: SearchTier, inputs: SearchInputs): any {
  let q = query;
  if (tier.includeCountry) q = applyCountryFilter(q, inputs.countryCode);
  if (tier.includeMajor) q = applyMajorFilter(q, inputs.major);
  if (tier.includeLevel) q = applyLevelFilter(q, inputs.level);
  if (tier.includeKeyword) q = applyKeywordFilter(q, inputs.keyword);
  return q;
}

async function runTier(
  supabase: ReturnType<typeof createClient>,
  tier: SearchTier,
  inputs: SearchInputs
): Promise<SafeScholarshipRow[]> {
  const candidateLimit = Math.max(inputs.limit * 4, 25);
  let query = supabase
    .from('scholarships_safe_listing')
    .select(SELECT_COLUMNS)
    .eq('is_active', true)
    .eq('is_expired', false)
    .not('slug', 'is', null);

  query = applyTierFilters(query, tier, inputs);

  const { data, error } = await query
    .order('is_verified', { ascending: false, nullsFirst: false })
    .order('deadline_date', { ascending: true, nullsFirst: false })
    .order('ranking_score', { ascending: false, nullsFirst: false })
    .limit(candidateLimit);

  if (error) throw new Error(error.message);
  return (data ?? []) as SafeScholarshipRow[];
}

function dedupeAndScore(
  rowsByTier: Array<{ tier: SearchTier; rows: SafeScholarshipRow[] }>,
  inputs: SearchInputs
): ScoredCandidate[] {
  const bySlug = new Map<string, ScoredCandidate>();

  for (const { tier, rows } of rowsByTier) {
    for (const row of rows) {
      const slug = row.slug?.trim();
      if (!slug || !row.title?.trim()) continue;

      const candidate: ScoredCandidate = {
        row,
        tier,
        score: scoreCandidate(row, tier, inputs)
      };

      const existing = bySlug.get(slug);
      if (!existing || candidate.score > existing.score) {
        bySlug.set(slug, candidate);
      }
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aRank = Number(a.row.ranking_score ?? 0);
    const bRank = Number(b.row.ranking_score ?? 0);
    return bRank - aRank;
  });
}

function countryHub(inputs: SearchInputs): SuggestedHub | null {
  if (!inputs.countryCode) return null;
  const slug = scholarshipCountrySlugFromCode(inputs.countryCode);
  if (!slug) return null;
  return {
    label: `Scholarships for students from ${inputs.country ?? inputs.countryCode}`,
    url: getCanonical(`/scholarships/for-students-from/${slug}`)
  };
}

function buildSuggestedHubs(inputs: SearchInputs): SuggestedHub[] {
  const hubs: SuggestedHub[] = [];
  const applicantCountryHub = countryHub(inputs);
  if (applicantCountryHub) hubs.push(applicantCountryHub);

  hubs.push({
    label: 'Browse all ScholarshipTop matches',
    url: getCanonical('/scholarships/hub/matches')
  });

  if (textIncludes(inputs.keyword, 'international') || inputs.countryCode) {
    hubs.push({
      label: 'International-friendly scholarships',
      url: getCanonical('/scholarships/hub/international-friendly')
    });
  }

  return hubs;
}

function tierCountsLog(rowsByTier: Array<{ tier: SearchTier; rows: SafeScholarshipRow[] }>) {
  return Object.fromEntries(
    rowsByTier.map(({ tier, rows }) => [tier.tier, rows.length])
  );
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  const configuredToken = expectedBearerToken();
  if (!configuredToken) {
    return NextResponse.json(
      { error: 'GPT search API token is not configured' },
      { status: 500 }
    );
  }

  if (bearerTokenFromRequest(request) !== configuredToken) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const country = readSingleParam(searchParams, 'country');
  const major = readSingleParam(searchParams, 'major');
  const level = readSingleParam(searchParams, 'level');
  const keyword = readSingleParam(searchParams, 'keyword');
  const limit = readLimit(searchParams);

  const inputs: SearchInputs = {
    country,
    countryCode: normalizeCountryCode(country),
    major,
    level,
    keyword,
    limit
  };

  try {
    const supabase = createClient();
    const tiers = buildSearchTiers(inputs);
    const rowsByTier: Array<{ tier: SearchTier; rows: SafeScholarshipRow[] }> = [];
    const collected = new Set<string>();

    for (const tier of tiers) {
      if (
        tier.tier !== 'exact_match' &&
        collected.size >= limit &&
        rowsByTier[0]?.rows.length >= MIN_EXACT_BEFORE_FALLBACK
      ) {
        break;
      }

      const rows = await runTier(supabase, tier, inputs);
      rowsByTier.push({ tier, rows });
      for (const row of rows) {
        if (row.slug) collected.add(row.slug);
      }
      if (collected.size >= limit && tier.tier !== 'exact_match') break;
    }

    const totalExact = rowsByTier.find(({ tier }) => tier.tier === 'exact_match')?.rows
      .length ?? 0;
    const scored = dedupeAndScore(rowsByTier, inputs);
    const results = scored
      .slice(0, limit)
      .map(mapResult)
      .filter((row): row is GptScholarshipResult => row != null);
    const fallbackUsed = results.some((result) => result.match_tier !== 'exact_match');
    const latencyMs = Math.round(performance.now() - startedAt);

    console.log('[gpt-search]', {
      filters: inputs,
      tierCounts: tierCountsLog(rowsByTier),
      finalCount: results.length,
      fallbackUsed,
      relaxedFilters: Array.from(
        new Set(results.flatMap((result) => result.relaxed_filters))
      ),
      latencyMs
    });

    const response: GptSearchResponse = {
      results,
      count: results.length,
      total_exact: Math.min(totalExact, limit),
      fallback_used: fallbackUsed,
      suggested_hubs: buildSuggestedHubs(inputs),
      filters: {
        country,
        country_code: inputs.countryCode,
        major,
        level,
        keyword,
        limit
      },
      notes: [
        'Results are live from scholarships_safe_listing.',
        'Each result includes a complete canonical_url. The GPT must not construct scholarship URLs itself.',
        fallbackUsed
          ? 'Some results are broader fallback matches. Use match_tier and match_reason when explaining them.'
          : 'All returned results are exact-tier matches for the provided filters.',
        'If results are sparse, recommend a stable ScholarshipTop hub from suggested_hubs or the knowledge file for broader browsing.'
      ]
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
