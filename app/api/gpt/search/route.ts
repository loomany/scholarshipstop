import { NextResponse } from 'next/server';

import { normalizeCountryCode } from '@/lib/scholarships/countryEligibility/countries';
import { getCanonical } from '@/lib/seo/canonical';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

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
  'is_verified'
].join(', ');

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
};

type GptScholarshipResult = {
  title: string;
  provider: string | null;
  deadline: string | null;
  amount_short: string | null;
  summary: string | null;
  url: string;
  canonical_url: string;
};

type GptSearchResponse = {
  results: GptScholarshipResult[];
  count: number;
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

function levelTerms(raw: string | null): string[] {
  const safe = sanitizeIlike(raw);
  if (!safe) return [];
  const normalized = safe.toLowerCase().replace(/\s+/g, '-');
  return LEVEL_SYNONYMS[normalized] ?? [safe.toLowerCase()];
}

function applyCountryFilter(query: any, country: string | null): any {
  const countryCode = normalizeCountryCode(country);
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

function mapResult(row: SafeScholarshipRow): GptScholarshipResult | null {
  const slug = row.slug?.trim();
  const title = row.title?.trim();
  if (!slug || !title) return null;

  const canonicalUrl = scholarshipUrl(row);
  return {
    title,
    provider: row.provider_name?.trim() || null,
    deadline: row.deadline_text?.trim() || row.deadline_date || null,
    amount_short: amountShort(row),
    summary: row.summary_short?.trim() || row.summary_long?.trim() || null,
    url: canonicalUrl,
    canonical_url: canonicalUrl
  };
}

export async function GET(request: Request) {
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
  const countryCode = normalizeCountryCode(country);

  try {
    const supabase = createClient();
    let query = supabase
      .from('scholarships_safe_listing')
      .select(SELECT_COLUMNS)
      .eq('is_active', true)
      .eq('is_expired', false)
      .not('slug', 'is', null);

    query = applyCountryFilter(query, country);
    query = applyMajorFilter(query, major);
    query = applyLevelFilter(query, level);
    query = applyKeywordFilter(query, keyword);

    const { data, error } = await query
      .order('is_verified', { ascending: false, nullsFirst: false })
      .order('deadline_date', { ascending: true, nullsFirst: false })
      .order('ranking_score', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = ((data ?? []) as SafeScholarshipRow[])
      .map(mapResult)
      .filter((row): row is GptScholarshipResult => row != null);

    const response: GptSearchResponse = {
      results,
      count: results.length,
      filters: {
        country,
        country_code: countryCode,
        major,
        level,
        keyword,
        limit
      },
      notes: [
        'Results are live from scholarships_safe_listing.',
        'Each result includes a complete canonical_url. The GPT must not construct scholarship URLs itself.',
        'If results are sparse, recommend a stable ScholarshipTop hub from the knowledge file for broader browsing.'
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
